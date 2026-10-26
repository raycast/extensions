import { Clipboard, LocalStorage, showToast, Toast } from "@raycast/api";
import { validateId } from "./client";

const PREFIX = "flowspeech.recovery.";
export interface RecoveryRecord {
  requestId: string;
  jobId?: string;
  createdAt: string;
  state: "pending" | "completed" | "interrupted";
}

export async function saveRecovery(record: RecoveryRecord): Promise<void> {
  const requestId = validateId(record.requestId);
  await LocalStorage.setItem(
    PREFIX + requestId,
    JSON.stringify({
      requestId,
      createdAt: record.createdAt,
      state: record.state,
      ...(record.jobId ? { jobId: validateId(record.jobId) } : {}),
    }),
  );
}

export async function recoveryRecords(): Promise<RecoveryRecord[]> {
  const items = await LocalStorage.allItems();
  const records: RecoveryRecord[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(PREFIX) || typeof value !== "string") continue;
    try {
      const record = JSON.parse(value);
      const requestId = validateId(record.requestId);
      if (
        key !== PREFIX + requestId ||
        typeof record.createdAt !== "string" ||
        !Number.isFinite(Date.parse(record.createdAt)) ||
        !["pending", "completed", "interrupted"].includes(record.state)
      )
        continue;
      records.push({
        requestId,
        createdAt: record.createdAt,
        state: record.state,
        ...(record.jobId ? { jobId: validateId(record.jobId) } : {}),
      });
    } catch {
      /* Ignore malformed unrelated or older local records. */
    }
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recoveryText(record: RecoveryRecord): string {
  return `requestId=${record.requestId}${record.jobId ? `; jobId=${record.jobId}` : ""}`;
}

export function errorJobId(error: unknown): string | undefined {
  if (!(error instanceof Error)) return;
  const match = /(?:^|;\s*)jobId=([a-f0-9-]+)(?:;|$)/i.exec(error.message);
  if (!match) return;
  try {
    return validateId(match[1]);
  } catch {
    return;
  }
}

export async function showRecovery(): Promise<void> {
  const records = await recoveryRecords();
  if (!records.length) {
    await showToast({ style: Toast.Style.Success, title: "No saved speech requests" });
    return;
  }
  await showToast({
    style: Toast.Style.Success,
    title: "Saved speech recovery IDs",
    message: recoveryText(records[0]),
    primaryAction: {
      title: "Copy All Recovery IDs",
      onAction: () => {
        void Clipboard.copy(
          records.map((record) => `${record.createdAt} ${record.state}: ${recoveryText(record)}`).join("\n"),
        );
      },
    },
  });
}
