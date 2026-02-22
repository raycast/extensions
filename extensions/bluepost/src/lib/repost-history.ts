import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "repost-history";

type RepostHistory = Record<string, string[]>;

async function getHistory(): Promise<RepostHistory> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as RepostHistory;
}

async function saveHistory(history: RepostHistory): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function markReposted(
  postUri: string,
  accountId: string,
): Promise<void> {
  const history = await getHistory();
  const existing = history[postUri] ?? [];
  if (!existing.includes(accountId)) {
    existing.push(accountId);
  }
  history[postUri] = existing;
  await saveHistory(history);
}

export async function getRepostedAccounts(postUri: string): Promise<string[]> {
  const history = await getHistory();
  return history[postUri] ?? [];
}

export async function getRepostHistoryMap(): Promise<RepostHistory> {
  return getHistory();
}
