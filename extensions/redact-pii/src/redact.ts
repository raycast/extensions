import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import type { Redact, Redaction } from "@desert-ant-labs/redact";

type RedactModule = typeof import("@desert-ant-labs/redact");

// The SDK is loaded from assets/runtime (see scripts/vendor-runtime.mjs) rather than
// bundled: esbuild cannot bundle koffi's native addon or the paths the SDK uses
// to find its prebuilt library and wasm files.
const runtime = path.join(environment.assetsPath, "runtime/node_modules");
const entry = (file: string) => pathToFileURL(path.join(runtime, file)).href;

/**
 * LiteRT.js loads its Emscripten glue with `importScripts` (Web Worker) or a
 * <script> tag, neither of which exists in Node. Provide a worker-style
 * `importScripts` that evaluates the glue as CommonJS, which is the shape
 * Emscripten expects once it detects Node. Only the wasm build needs this.
 */
function installWorkerShim() {
  const scope = globalThis as typeof globalThis & {
    self?: typeof globalThis & { ModuleFactory?: unknown };
    importScripts?: (url: string) => void;
  };
  scope.self ??= globalThis;
  scope.importScripts ??= (url) => {
    const file = url.startsWith("file:") ? fileURLToPath(url) : url;
    const source = fs.readFileSync(file, "utf8");
    const run = vm.runInThisContext(
      `(function (require, __dirname, __filename, module, exports) {${source}\n})`,
      { filename: file },
    );
    const module = { exports: {} as unknown };
    run(createRequire(file), path.dirname(file), file, module, module.exports);
    if (!scope.self!.ModuleFactory && typeof module.exports === "function") {
      scope.self!.ModuleFactory = module.exports;
    }
  };
}

/**
 * The wasm build has no localStorage under Node, so without a store it keeps
 * its license install id in memory and each command run counts as a new
 * device. This file-backed store keeps one install id and the month's license.
 * (The native build stores these itself, in macOS user defaults.)
 */
function installUsageStore() {
  const scope = globalThis as typeof globalThis & {
    __dalUsageStore?: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
    };
  };
  const file = path.join(environment.supportPath, "desert-ant-usage.json");
  const read = (): Record<string, string> => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  };
  scope.__dalUsageStore ??= {
    getItem: (key) => read()[key] ?? null,
    setItem: (key, value) => {
      fs.mkdirSync(environment.supportPath, { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ ...read(), [key]: value }));
    },
  };
}

let loaded: Promise<{ sdk: RedactModule; redact: Redact }> | undefined;

/**
 * Loads the model once per command process; the first run downloads it from
 * Hugging Face. Apple silicon uses the native Core ML build; Intel Macs, which
 * the native build does not support, fall back to the slower WebAssembly build.
 */
function load() {
  loaded ??= (async () => {
    // Identifies this extension to Desert Ant Labs' license check.
    (globalThis as { __dalAppId?: string }).__dalAppId ??= "raycast-redact-pii";
    // Keep the model in the extension's own folder, so it goes when the extension does.
    const cacheRoot = environment.supportPath;
    if (process.arch === "arm64") {
      const sdk: RedactModule = await import(
        entry("@desert-ant-labs/redact/node.js")
      );
      return { sdk, redact: await sdk.Redact.load({ cacheRoot }) };
    }
    installWorkerShim();
    installUsageStore();
    const litert = await import(entry("@litertjs/core/dist/index.js"));
    const sdk: RedactModule = await import(
      entry("@desert-ant-labs/redact/browser.js")
    );
    return { sdk, redact: await sdk.Redact.load({ litert, cacheRoot }) };
  })().catch((error) => {
    loaded = undefined;
    throw error;
  });
  return loaded;
}

export async function redactText(text: string): Promise<Redaction> {
  const { redactOrganizations } = getPreferenceValues<Preferences>();
  const { sdk, redact } = await load();
  const redaction = await redact.redaction(text, {
    labels: redactOrganizations ? sdk.ALL_LABELS : sdk.DEFAULT_LABELS,
  });
  if (redaction.items.length > 0) {
    const mapping: Mapping = redaction.items.map((item) => [
      item.placeholder,
      item.original,
    ]);
    const stored: StoredMapping = { savedAt: Date.now(), mapping };
    await LocalStorage.setItem(MAPPING_KEY, JSON.stringify(stored));
  } else {
    // Keep the promise that redacting something else deletes earlier values.
    await LocalStorage.removeItem(MAPPING_KEY);
  }
  return redaction;
}

// Placeholders restart at _1 for every redaction, so only the latest mapping
// can be restored; an older one would fill in the wrong values.
const MAPPING_KEY = "last-mapping";
// The mapping holds the original personal data in plain text, so it is only
// kept long enough to restore the replies to one redaction.
const MAPPING_TTL_MS = 60 * 60 * 1000;
type Mapping = [placeholder: string, original: string][];
type StoredMapping = { savedAt: number; mapping: Mapping };

/** Deletes the stored mapping, or only an expired one when `onlyExpired` is set. Returns whether it deleted anything. */
export async function forgetMapping(onlyExpired: boolean): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(MAPPING_KEY);
  if (!raw) return false;
  if (onlyExpired) {
    const { savedAt }: Partial<StoredMapping> = JSON.parse(raw);
    if (savedAt && Date.now() - savedAt <= MAPPING_TTL_MS) return false;
  }
  await LocalStorage.removeItem(MAPPING_KEY);
  return true;
}

/** Fills the originals from the most recent redaction back into `text`. */
export async function restoreText(
  text: string,
): Promise<{ text: string; restored: number }> {
  const raw = await LocalStorage.getItem<string>(MAPPING_KEY);
  const stored: Partial<StoredMapping> = raw ? JSON.parse(raw) : {};
  if (!stored.mapping || !stored.savedAt)
    throw new Error("Nothing to restore yet: redact some text first");
  if (Date.now() - stored.savedAt > MAPPING_TTL_MS) {
    await LocalStorage.removeItem(MAPPING_KEY);
    throw new Error(
      "The last redaction is more than an hour old, so its values were deleted",
    );
  }
  const { mapping } = stored;
  let restored = 0;
  for (const [placeholder, original] of mapping) {
    if (!text.includes(placeholder)) continue;
    // A function inserts `original` literally; a string would expand `$&`, `$$`, etc.
    text = text.replaceAll(placeholder, () => original);
    restored++;
  }
  return { text, restored };
}

export function summarize(redaction: Redaction): string {
  const count = redaction.items.length;
  return count === 0
    ? "No personal data found"
    : `Redacted ${count} item${count === 1 ? "" : "s"}`;
}
