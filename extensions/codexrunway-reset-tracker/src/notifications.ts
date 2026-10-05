import { LocalStorage, environment, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { matchesPlan, ResetRecord, statusLabel, formatDate } from "./api";
import { fetchRecords, FetchedRecords } from "./requests";

interface NotificationState {
  plan: string;
  enabled: boolean;
  startedAt: number;
  seen: string[];
}

function completion(record: ResetRecord) {
  const done =
    record.kind === "reset_completed" ||
    record.scheduleState === "fulfilled" ||
    Boolean(record.completedAt);
  const at =
    record.completedAt ??
    (done ? record.effectiveAt : null) ??
    (record.kind === "reset_completed" ? record.announcedAt : null);
  if (
    !done ||
    !at ||
    !Number.isFinite(Date.parse(at)) ||
    Date.parse(at) > Date.now()
  )
    return undefined;
  return { record, at, key: record.completionRecordId ?? record.id };
}

export async function notifyNewResets(
  data: FetchedRecords,
  plan: string,
  enabled: boolean,
): Promise<void> {
  if (data.warning) return;
  const raw = await LocalStorage.getItem<string>("reset-notifications");
  let previous: NotificationState | undefined;
  try {
    const saved = raw ? (JSON.parse(raw) as NotificationState) : undefined;
    if (
      saved &&
      typeof saved.plan === "string" &&
      typeof saved.enabled === "boolean" &&
      Number.isFinite(saved.startedAt) &&
      Array.isArray(saved.seen) &&
      saved.seen.every((key) => typeof key === "string")
    )
      previous = saved;
  } catch {
    /* Invalid local state establishes a quiet new baseline. */
  }
  const completed = [
    ...new Map(
      data.data.items
        .filter((record) => matchesPlan(record, plan))
        .map(completion)
        .filter((item) => item !== undefined)
        .map((item) => [item.key, item]),
    ).values(),
  ];
  const baseline =
    !previous || previous.plan !== plan || previous.enabled !== enabled;
  const startedAt = baseline ? Date.now() : (previous?.startedAt ?? Date.now());
  const fresh =
    enabled && !baseline
      ? completed.filter(
          (item) =>
            !previous?.seen.includes(item.key) &&
            Date.parse(item.at) >= startedAt,
        )
      : [];
  if (fresh.length) {
    const latest = fresh.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
    // Pass source-derived text as argv, never as executable AppleScript.
    await runAppleScript(
      `on run argv
      display notification (item 2 of argv) with title (item 1 of argv)
    end run`,
      [
        "CodexRunway Reset Confirmed",
        `${fresh.length > 1 ? `${fresh.length} resets confirmed. ` : ""}${statusLabel(latest.record)} · ${latest.record.completedAt || latest.record.effectiveAt ? "Completed" : "Announced"} ${formatDate(latest.at)}`,
      ],
      { timeout: 5000 },
    );
  }
  // ponytail: retain 200 completion IDs; increase if the upstream recent-record window grows.
  const seen = [
    ...new Set([
      ...(baseline ? [] : (previous?.seen ?? [])),
      ...completed.map((item) => item.key),
    ]),
  ].slice(-200);
  await LocalStorage.setItem(
    "reset-notifications",
    JSON.stringify({ plan, enabled, startedAt, seen }),
  );
}

export async function fetchMenuRecords(
  url: string,
  plan: string,
  enabled: boolean,
): Promise<FetchedRecords & { notificationWarning?: string }> {
  const data = await fetchRecords(url);
  // Raycast serializes background runs of this command. Foreground opens never send or update the baseline.
  if (environment.launchType === LaunchType.Background) {
    try {
      await notifyNewResets(data, plan, enabled);
    } catch (error) {
      return {
        ...data,
        notificationWarning: `Notification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
  return data;
}
