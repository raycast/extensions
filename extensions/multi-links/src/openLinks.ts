import { Alert, Icon, confirmAlert, getPreferenceValues, open } from "@raycast/api";
import type { Application } from "@raycast/api";
import { extractUrls, type ExtractedItem } from "./extractUrls";
import { friendly } from "./errors";
import { resolvePreferences } from "./preferences";
import { recordHistory } from "./historyStore";

export type OpenSource = "selection" | "clipboard" | "history" | "filter";

export interface OpenOptions {
  source: OpenSource;
  skipRecording?: boolean;
}

export interface OpenResult {
  total: number;
  opened: number;
  failed: number;
  failures: Array<{ uri: string; reason: string }>;
  cancelled?: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// macOS file types where `open` runs code: app bundles, installers, shell/scripts,
// automation. Extracted text is untrusted (clipboard/selection), so any of these gets
// an unconditional confirm before launch — regardless of which extractor produced the
// path (file-ext, absolute path, or file:// URI).
const DANGEROUS_EXTS = new Set([
  "app",
  "dmg",
  "pkg",
  "mpkg",
  "xip", // bundles / installers
  "sh",
  "command",
  "bash",
  "zsh", // shell scripts
  "scpt",
  "scptd",
  "workflow", // automation
  "terminal",
  "inetloc",
  "fileloc",
  "webloc", // settings / location shortcuts that launch a terminal or follow an arbitrary target
]);

function isDangerousLocal(item: ExtractedItem): boolean {
  if (item.type !== "local-path" && item.type !== "file-ext") return false;
  // These are filesystem paths, not URLs: `?` and `#` are legal filename characters, so don't
  // split on them (doing so truncates `/a/issue#42/run.sh` before the extension). Strip the
  // file:// scheme and any trailing slash (bundle dirs tab-complete to `Foo.app/`), then test the
  // extension of the final path segment.
  const path = item.url.replace(/^file:\/\//, "").replace(/\/+$/, "");
  const segment = path.split("/").pop() ?? "";
  const dot = segment.lastIndexOf(".");
  if (dot <= 0) return false; // no extension, or a dotfile like `.zshrc`
  return DANGEROUS_EXTS.has(segment.slice(dot + 1).toLowerCase());
}

function formatBreakdown(items: ExtractedItem[]): string {
  const order: Array<{ type: ExtractedItem["type"]; label: string }> = [
    { type: "web", label: "Web" },
    { type: "local-path", label: "Local" },
    { type: "custom-scheme", label: "Custom-scheme" },
    { type: "mailto", label: "Mailto" },
    { type: "file-ext", label: "File-ext" },
  ];
  const counts = new Map<ExtractedItem["type"], number>();
  for (const item of items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  return order
    .filter(({ type }) => (counts.get(type) ?? 0) > 0)
    .map(({ type, label }) => `${label}: ${counts.get(type)}`)
    .join(" · ");
}

// First-5 bulleted preview with a "…and N more" suffix. Shared by both confirm dialogs.
function formatPreview(items: ExtractedItem[]): string {
  const preview = items
    .slice(0, 5)
    .map((i) => `  • ${i.raw}`)
    .join("\n");
  const more = items.length > 5 ? `\n  …and ${items.length - 5} more` : "";
  return `${preview}${more}`;
}

async function openOne(item: ExtractedItem, browser?: Application): Promise<void> {
  if (item.type === "web") {
    if (browser) {
      await open(item.url, browser.bundleId ?? browser);
    } else {
      await open(item.url);
    }
  } else {
    await open(item.url);
  }
}

async function openParallelChunked(
  items: ExtractedItem[],
  browser?: Application,
): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = [];
  for (let i = 0; i < items.length; i += 10) {
    const chunk = items.slice(i, i + 10);
    const chunkResults = await Promise.allSettled(chunk.map((item) => openOne(item, browser)));
    results.push(...chunkResults);
  }
  return results;
}

async function openSequential(
  items: ExtractedItem[],
  browser: Application | undefined,
  delayMs: number,
): Promise<{ opened: number; failures: Array<{ uri: string; reason: string }> }> {
  const failures: Array<{ uri: string; reason: string }> = [];
  let opened = 0;
  for (let i = 0; i < items.length; i++) {
    try {
      await openOne(items[i], browser);
      opened++;
    } catch (e) {
      failures.push({ uri: items[i].raw, reason: friendly(e) });
    }
    if (i < items.length - 1) {
      await sleep(delayMs);
    }
  }
  return { opened, failures };
}

/**
 * Opens a pre-extracted list of items. Used by:
 *  - openLinks(text, opts) wrapper (existing no-view commands)
 *  - history view "Open All Again" (opts.skipRecording=true — avoids double-recording)
 *  - filter view "Open Selected" / "Open This Item" / etc.
 *
 * Records to history (fire-and-forget) when total > 0 and !cancelled and !opts.skipRecording.
 */
export async function openItems(items: ExtractedItem[], opts: OpenOptions): Promise<OpenResult> {
  const prefs = resolvePreferences(getPreferenceValues<Preferences>());
  const filtered = prefs.openAnyUriType ? items : items.filter((i) => i.type === "web");
  if (filtered.length === 0) {
    return { total: 0, opened: 0, failed: 0, failures: [] };
  }

  // Executable/installer safety gate. Independent of confirmEnabled and confirmThreshold —
  // launching code from untrusted text is a separate risk from opening "many links", so it
  // always confirms, even for a single item. Declining does NOT abort the batch: the executables
  // are dropped and the remaining safe links still open (one stray script in a big paste
  // shouldn't block everything). The count gate below then runs on whatever's left.
  const dangerous: ExtractedItem[] = [];
  const safe: ExtractedItem[] = [];
  for (const item of filtered) (isDangerousLocal(item) ? dangerous : safe).push(item);

  let toOpen = filtered;
  if (dangerous.length > 0) {
    const openAnyway = await confirmAlert({
      title: `Open ${dangerous.length} executable${dangerous.length === 1 ? "" : "s"}?`,
      message: `These can run code on your Mac:\n\n${formatPreview(dangerous)}\n\n"Open Anyway" includes them; otherwise they're skipped.`,
      icon: Icon.Warning,
      primaryAction: { title: "Open Anyway", style: Alert.ActionStyle.Destructive },
      dismissAction: {
        title: safe.length === 0 ? "Cancel" : "Skip Executables",
        style: Alert.ActionStyle.Cancel,
      },
    });
    if (!openAnyway) {
      toOpen = safe;
      if (toOpen.length === 0) {
        return { total: filtered.length, opened: 0, failed: 0, failures: [], cancelled: true };
      }
    }
  }

  // "Many links" gate — independent of the executable gate, and evaluated on the set actually
  // about to open (executables may have been skipped above).
  const total = toOpen.length;
  if (prefs.confirmEnabled && total >= prefs.confirmThreshold) {
    const confirmed = await confirmAlert({
      title: `Open ${total} links?`,
      message: `${formatBreakdown(toOpen)}\n\n${formatPreview(toOpen)}`,
      icon: Icon.Globe,
      primaryAction: { title: "Open All", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    });
    if (!confirmed) {
      return { total, opened: 0, failed: 0, failures: [], cancelled: true };
    }
  }

  let result: OpenResult;
  if (prefs.delayMs === 0) {
    const results = await openParallelChunked(toOpen, prefs.browser);
    const opened = results.filter((r) => r.status === "fulfilled").length;
    const failed = total - opened;
    const failures = toOpen
      .map((item, i) =>
        results[i].status === "rejected"
          ? { uri: item.raw, reason: friendly((results[i] as PromiseRejectedResult).reason) }
          : null,
      )
      .filter((x): x is { uri: string; reason: string } => x !== null);
    result = { total, opened, failed, failures };
  } else {
    const { opened, failures } = await openSequential(toOpen, prefs.browser, prefs.delayMs);
    result = { total, opened, failed: total - opened, failures };
  }

  // LD-P4-01: fire-and-forget history recording. Skip when cancelled (returned earlier above),
  // skip when caller opts.skipRecording=true (history "Open All Again" replay).
  if (result.total > 0 && !opts.skipRecording) {
    void recordHistory(toOpen, opts.source, result.opened).catch(() => {
      // Silent failure per LD-P4-01 — history write is auxiliary, must not block the user.
    });
  }

  return result;
}

/**
 * Thin wrapper: extract URLs from text, then delegate to openItems.
 * Public signature preserved from P3 — existing cmd files keep working unchanged.
 */
export async function openLinks(text: string, opts: OpenOptions): Promise<OpenResult> {
  const items = extractUrls(text);
  return openItems(items, opts);
}
