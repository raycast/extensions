import { Alert, Icon, confirmAlert, getPreferenceValues, open } from "@raycast/api";
import type { Application } from "@raycast/api";
import { extractUrls, type ExtractedItem } from "./extractUrls";
import { friendly } from "./errors";
import { resolvePreferences, type Preferences } from "./preferences";
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
  const total = filtered.length;
  if (total === 0) {
    return { total: 0, opened: 0, failed: 0, failures: [] };
  }

  if (prefs.confirmEnabled && total >= prefs.confirmThreshold) {
    const breakdown = formatBreakdown(filtered);
    const preview = filtered
      .slice(0, 5)
      .map((i) => `  • ${i.raw}`)
      .join("\n");
    const more = filtered.length > 5 ? `\n  …and ${filtered.length - 5} more` : "";
    const confirmed = await confirmAlert({
      title: `Open ${filtered.length} links?`,
      message: `${breakdown}\n\n${preview}${more}`,
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
    const results = await openParallelChunked(filtered, prefs.browser);
    const opened = results.filter((r) => r.status === "fulfilled").length;
    const failed = total - opened;
    const failures = filtered
      .map((item, i) =>
        results[i].status === "rejected"
          ? { uri: item.raw, reason: friendly((results[i] as PromiseRejectedResult).reason) }
          : null,
      )
      .filter((x): x is { uri: string; reason: string } => x !== null);
    result = { total, opened, failed, failures };
  } else {
    const { opened, failures } = await openSequential(filtered, prefs.browser, prefs.delayMs);
    result = { total, opened, failed: total - opened, failures };
  }

  // LD-P4-01: fire-and-forget history recording. Skip when cancelled (returned earlier above),
  // skip when caller opts.skipRecording=true (history "Open All Again" replay).
  if (result.total > 0 && !opts.skipRecording) {
    void recordHistory(filtered, opts.source, result.opened).catch(() => {
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
