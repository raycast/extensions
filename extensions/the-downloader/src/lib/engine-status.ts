import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ENGINE_TITLES,
  EngineId,
  EngineSettings,
  FM_PATH,
  parseFmAvailability,
  raycastAvailable,
  stripAnsi,
} from "./ai-engines.js";
import { runWithWatchdog } from "./run.js";

// Whether each AI engine can answer right now, and — when it can't — a notice
// in plain words with the fixes that help. The chat and the start screen show
// these before you ask, so a missing download or setting never looks like a
// broken answer.

/** System Settings → Siri (Apple Intelligence) on macOS 27. */
export const APPLE_SETTINGS_URL = "x-apple.systempreferences:com.apple.Siri-Settings.extension";
const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";
const SUGGESTED_OLLAMA_MODEL = "llama3.2";

export type EngineFix =
  | { type: "open-url"; title: string; url: string }
  | { type: "copy"; title: string; text: string }
  | { type: "preferences" }
  | { type: "switch" }
  | { type: "retry" };

export type EngineStatus =
  | { engine: EngineId; ready: true; detail?: string }
  | {
      engine: EngineId;
      ready: false;
      state: string;
      title: string;
      message: string;
      fixes: EngineFix[];
      /** It will fix itself (a download finishing): worth re-checking on a timer. */
      waiting?: boolean;
    };

const copy = (text: string): EngineFix => ({ type: "copy", title: "Copy Terminal Command", text });
const openAppleSettings: EngineFix = {
  type: "open-url",
  title: "Open Apple Intelligence Settings",
  url: APPLE_SETTINGS_URL,
};
const retry: EngineFix = { type: "retry" };
const switchEngine: EngineFix = { type: "switch" };

// ---------------------------------------------------------------------------
// Apple Intelligence
// ---------------------------------------------------------------------------

export type FmProbe = { fmInstalled: boolean; code: number | null; output: string };

export function appleStatus(probe: FmProbe): EngineStatus {
  const engine: EngineId = "apple";
  if (!probe.fmInstalled) {
    return {
      engine,
      ready: false,
      state: "missing",
      title: "Apple Intelligence needs macOS 27",
      message:
        "Chatting with Apple Intelligence uses the `fm` tool that comes with macOS 27 on Macs with Apple silicon. Pick Raycast AI or Ollama instead.",
      fixes: [switchEngine],
    };
  }
  const availability = parseFmAvailability(probe.output, probe.code);
  if (availability.available) return { engine, ready: true };
  switch (availability.reason) {
    case "license":
      return {
        engine,
        ready: false,
        state: "license",
        title: "Accept Apple's terms for the fm tool",
        message:
          "Apple's `fm` tool needs its terms accepted once, by an administrator. Open Terminal, run `sudo fm license`, read the terms and agree — then check again.",
        fixes: [copy("sudo fm license"), retry, switchEngine],
      };
    case "modelNotReady":
      return {
        engine,
        ready: false,
        state: "downloading",
        title: "Apple Intelligence is still downloading",
        message:
          "Apple Intelligence is on, but its model hasn't finished downloading yet. This can take a while after you turn it on — keep your Mac online and plugged in. You can follow it in System Settings → Siri. This chat checks again every 30 seconds.",
        fixes: [openAppleSettings, retry, switchEngine],
        waiting: true,
      };
    case "appleIntelligenceNotEnabled":
      return {
        engine,
        ready: false,
        state: "off",
        title: "Apple Intelligence is off",
        message:
          "Turn on Apple Intelligence in System Settings → Siri. Its model then downloads in the background; once it's done, you can chat here.",
        fixes: [openAppleSettings, retry, switchEngine],
      };
    case "deviceNotEligible":
      return {
        engine,
        ready: false,
        state: "unsupported",
        title: "This Mac can't run Apple Intelligence",
        message: "Apple Intelligence needs a Mac with Apple silicon. Pick Raycast AI or Ollama instead.",
        fixes: [switchEngine],
      };
    default: {
      const said = stripAnsi(probe.output).trim() || `fm exited with code ${probe.code ?? "unknown"}`;
      return {
        engine,
        ready: false,
        state: "unavailable",
        title: "Apple Intelligence isn't available",
        message: `Apple's \`fm\` tool says: “${said}”. Try again in a moment, or pick another engine.`,
        fixes: [retry, switchEngine],
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Ollama
// ---------------------------------------------------------------------------

export type OllamaProbe = {
  url: string;
  /** The Ollama app or CLI is on this Mac. */
  installed: boolean;
  /** `/api/tags` answered. */
  reachable: boolean;
  models: string[];
  /** The Ollama Model preference, if set. */
  wanted?: string;
};

function isLocal(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(new URL(url).hostname);
  } catch {
    return true;
  }
}

/** Ollama resolves a bare name to its `:latest` tag. */
function hasModel(models: string[], wanted: string): boolean {
  return models.includes(wanted) || (!wanted.includes(":") && models.includes(`${wanted}:latest`));
}

export function ollamaStatus(probe: OllamaProbe): EngineStatus {
  const engine: EngineId = "ollama";
  const wanted = probe.wanted?.trim();
  if (!probe.reachable) {
    if (!probe.installed && isLocal(probe.url)) {
      return {
        engine,
        ready: false,
        state: "missing",
        title: "Ollama isn't installed",
        message: `Ollama runs AI models on your Mac for free. Install it, then download a model with \`ollama pull ${SUGGESTED_OLLAMA_MODEL}\`.`,
        fixes: [{ type: "open-url", title: "Get Ollama", url: OLLAMA_DOWNLOAD_URL }, retry, switchEngine],
      };
    }
    return {
      engine,
      ready: false,
      state: "stopped",
      title: "Ollama isn't running",
      message: isLocal(probe.url)
        ? "Open the Ollama app, or run `ollama serve` in Terminal — then check again."
        : `Couldn't reach Ollama at ${probe.url}. Make sure it's running there and reachable from this Mac, or change Ollama URL in Chat About Link's preferences.`,
      fixes: [
        ...(isLocal(probe.url) ? [copy("ollama serve")] : [{ type: "preferences" } as EngineFix]),
        retry,
        switchEngine,
      ],
    };
  }
  if (probe.models.length === 0) {
    return {
      engine,
      ready: false,
      state: "no-models",
      title: "Ollama has no models yet",
      message: `Download one in Terminal with \`ollama pull ${SUGGESTED_OLLAMA_MODEL}\` (about 2 GB), then check again.`,
      fixes: [copy(`ollama pull ${SUGGESTED_OLLAMA_MODEL}`), retry, switchEngine],
    };
  }
  if (wanted && !hasModel(probe.models, wanted)) {
    return {
      engine,
      ready: false,
      state: "model-missing",
      title: `Ollama doesn't have “${wanted}”`,
      message: `Download it with \`ollama pull ${wanted}\`, or clear Ollama Model in Chat About Link's preferences to use ${probe.models[0]}, which is installed.`,
      fixes: [copy(`ollama pull ${wanted}`), { type: "preferences" }, retry],
    };
  }
  return { engine, ready: true, detail: wanted || probe.models[0] };
}

// ---------------------------------------------------------------------------
// Raycast AI
// ---------------------------------------------------------------------------

export function raycastStatus(canAccess: boolean): EngineStatus {
  if (canAccess) return { engine: "raycast", ready: true };
  return {
    engine: "raycast",
    ready: false,
    state: "no-pro",
    title: "Raycast AI needs Raycast Pro",
    message: "Pick Apple Intelligence or Ollama in the engine dropdown to chat for free, or upgrade to Raycast Pro.",
    fixes: [switchEngine],
  };
}

// ---------------------------------------------------------------------------

/** Automatic: the first ready engine (Raycast AI, then Apple, then Ollama), or one notice covering all of them. */
export function automaticStatus(statuses: EngineStatus[]): EngineStatus {
  const ready = statuses.find((s) => s.ready);
  if (ready) return ready;
  const lines = statuses.map((s) => `- **${ENGINE_TITLES[s.engine]}:** ${s.ready ? "ready" : s.title}`).join("\n");
  const fixes = statuses.flatMap((s) => (s.ready ? [] : s.fixes)).filter((f) => f.type !== "switch");
  const unique = fixes.filter((f, i) => fixes.findIndex((g) => JSON.stringify(g) === JSON.stringify(f)) === i);
  return {
    engine: statuses[0]?.engine ?? "raycast",
    ready: false,
    state: "none-ready",
    title: "No AI engine is ready yet",
    message: `Chat needs one of these:\n${lines}\n\nPick one in the engine dropdown to see how to set it up.`,
    fixes: unique.some((f) => f.type === "retry") ? unique : [...unique, retry],
    waiting: statuses.some((s) => !s.ready && s.waiting),
  };
}

/** A ready engine to suggest instead of `current`. */
export function switchTarget(statuses: EngineStatus[], current: EngineId): EngineId | undefined {
  return statuses.find((s) => s.ready && s.engine !== current)?.engine;
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

async function probeApple(): Promise<FmProbe> {
  if (process.platform !== "darwin" || !fs.existsSync(FM_PATH)) return { fmInstalled: false, code: null, output: "" };
  try {
    const { code, stdout, stderr } = await runWithWatchdog(FM_PATH, ["available"], { idleMs: 5_000 });
    return { fmInstalled: true, code, output: `${stdout}\n${stderr}` };
  } catch (error) {
    return { fmInstalled: true, code: null, output: error instanceof Error ? error.message : String(error) };
  }
}

function ollamaInstalled(): boolean {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  return [
    "/Applications/Ollama.app",
    path.join(home, "Applications", "Ollama.app"),
    "/usr/local/bin/ollama",
    "/opt/homebrew/bin/ollama",
    // Windows installs it per user.
    path.join(localAppData, "Programs", "Ollama", "ollama.exe"),
  ].some((p) => fs.existsSync(p));
}

async function probeOllama(settings: EngineSettings): Promise<OllamaProbe> {
  const url = settings.ollamaUrl.replace(/\/+$/, "");
  const base = { url, installed: ollamaInstalled(), wanted: settings.ollamaModel };
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(1_500) });
    if (!res.ok) return { ...base, reachable: false, models: [] };
    const data = (await res.json()) as { models?: { name: string }[] };
    return { ...base, reachable: true, models: (data.models ?? []).map((m) => m.name) };
  } catch {
    return { ...base, reachable: false, models: [] };
  }
}

export async function checkEngine(id: EngineId, settings: EngineSettings): Promise<EngineStatus> {
  switch (id) {
    case "raycast":
      return raycastStatus(raycastAvailable());
    case "apple":
      return appleStatus(await probeApple());
    case "ollama":
      return ollamaStatus(await probeOllama(settings));
  }
}

/** Every engine's status, in Automatic's order. */
export function checkAllEngines(settings: EngineSettings): Promise<EngineStatus[]> {
  return Promise.all((Object.keys(ENGINE_TITLES) as EngineId[]).map((id) => checkEngine(id, settings)));
}
