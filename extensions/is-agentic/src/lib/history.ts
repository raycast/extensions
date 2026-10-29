import { LocalStorage } from "@raycast/api";

import { Report } from "./is-agentic";

const HISTORY_KEY = "report-history";
const HISTORY_LIMIT = 25;

export interface HistoryEntry {
  target: string;
  displayTarget: string;
  reportUrl: string;
  score: number | null;
  scoreLabel: string;
  scannedAt: string;
  issueCount: number;
  viewedAt: string;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveReportToHistory(report: Report): Promise<void> {
  const entry: HistoryEntry = {
    target: report.target,
    displayTarget: report.display_target,
    reportUrl: report.report_url,
    score: report.score,
    scoreLabel: report.score_label,
    scannedAt: report.scanned_at,
    issueCount: report.issues.length,
    viewedAt: new Date().toISOString(),
  };
  const history = await getHistory();
  const next = [entry, ...history.filter((item) => item.target !== report.target)].slice(0, HISTORY_LIMIT);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function removeFromHistory(target: string): Promise<void> {
  const history = await getHistory();
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter((entry) => entry.target !== target)));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
