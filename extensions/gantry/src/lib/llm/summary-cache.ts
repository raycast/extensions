import { LocalStorage } from "@raycast/api";
import { createHash } from "crypto";

const CACHE_PREFIX = "gantry-summary-";

function hashContent(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

export async function getCachedSummary(
  jobLabel: string,
  logContent: string,
): Promise<string | null> {
  const key = CACHE_PREFIX + jobLabel;
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as { summary: string; contentHash: string };
    if (entry.contentHash !== hashContent(logContent)) return null;
    return entry.summary;
  } catch {
    return null;
  }
}

export async function setCachedSummary(
  jobLabel: string,
  logContent: string,
  summary: string,
): Promise<void> {
  const key = CACHE_PREFIX + jobLabel;
  const entry = { summary, contentHash: hashContent(logContent) };
  await LocalStorage.setItem(key, JSON.stringify(entry));
}
