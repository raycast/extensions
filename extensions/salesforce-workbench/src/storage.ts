import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { getHistoryPolicy } from "./preferences";
import { DescribeResult, HistoryEntry, MutationAuditEntry, QueryHistoryEntry, SalesforceRecord } from "./types";

const HISTORY_KEY = "salesforce-workbench-history-v1";
const DESCRIBE_PREFIX = "salesforce-describe-v1";
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const MAX_SNAPSHOT_ROWS = 500;
const DESCRIBE_TTL_MS = 24 * 60 * 60 * 1000;

export function pruneHistory(entries: HistoryEntry[], now = new Date(), days = 30, limit = 100): HistoryEntry[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return entries
    .filter((entry) => new Date(entry.timestamp).getTime() >= cutoff)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function capRecordSnapshot(records: SalesforceRecord[]): { records: SalesforceRecord[]; truncated: boolean } {
  let capped = records.slice(0, MAX_SNAPSHOT_ROWS);
  let serialized = JSON.stringify(capped);
  while (Buffer.byteLength(serialized, "utf8") > MAX_SNAPSHOT_BYTES && capped.length > 1) {
    capped = capped.slice(0, Math.ceil(capped.length / 2));
    serialized = JSON.stringify(capped);
  }
  return { records: capped, truncated: capped.length < records.length };
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as HistoryEntry[];
    const policy = getHistoryPolicy();
    return pruneHistory(parsed, new Date(), policy.days, policy.limit);
  } catch {
    return [];
  }
}

async function addHistory(entry: HistoryEntry): Promise<void> {
  const policy = getHistoryPolicy();
  const entries = pruneHistory([entry, ...(await getHistory())], new Date(), policy.days, policy.limit);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export async function addQueryHistory(
  entry: Omit<QueryHistoryEntry, "id" | "kind" | "records" | "resultTruncated"> & { records: SalesforceRecord[] },
): Promise<QueryHistoryEntry> {
  const snapshot = capRecordSnapshot(entry.records);
  const complete: QueryHistoryEntry = {
    ...entry,
    id: randomUUID(),
    kind: "query",
    records: snapshot.records,
    resultTruncated: snapshot.truncated,
  };
  await addHistory(complete);
  return complete;
}

export async function addMutationHistory(entry: Omit<MutationAuditEntry, "id" | "kind">): Promise<MutationAuditEntry> {
  const complete: MutationAuditEntry = { ...entry, id: randomUUID(), kind: "mutation" };
  await addHistory(complete);
  return complete;
}

export async function markQuerySaved(entry: QueryHistoryEntry): Promise<void> {
  const entries = await getHistory();
  const updated = entries.map((candidate) => (candidate.id === entry.id ? { ...candidate, saved: true } : candidate));
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(kind?: HistoryEntry["kind"]): Promise<void> {
  if (!kind) {
    await LocalStorage.removeItem(HISTORY_KEY);
    return;
  }
  const remaining = (await getHistory()).filter((entry) => entry.kind !== kind);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));
}

function describeKey(orgId: string, apiVersion: string, objectApiName: string): string {
  return `${DESCRIBE_PREFIX}:${orgId}:${apiVersion}:${objectApiName}`;
}

export async function getCachedDescribe(
  orgId: string,
  apiVersion: string,
  objectApiName: string,
): Promise<DescribeResult | undefined> {
  const raw = await LocalStorage.getItem<string>(describeKey(orgId, apiVersion, objectApiName));
  if (!raw) return undefined;
  try {
    const cached = JSON.parse(raw) as { timestamp: string; describe: DescribeResult };
    if (Date.now() - new Date(cached.timestamp).getTime() > DESCRIBE_TTL_MS) return undefined;
    return cached.describe;
  } catch {
    return undefined;
  }
}

export async function setCachedDescribe(orgId: string, apiVersion: string, describe: DescribeResult): Promise<void> {
  await LocalStorage.setItem(
    describeKey(orgId, apiVersion, describe.name),
    JSON.stringify({ timestamp: new Date().toISOString(), describe }),
  );
}

export async function clearCachedDescribe(orgId: string, apiVersion: string, objectApiName: string): Promise<void> {
  await LocalStorage.removeItem(describeKey(orgId, apiVersion, objectApiName));
}
