import { launchCommand, LaunchType } from "@raycast/api";
import { actionTitle, TetheredEvent } from "./events";

export function nextEventSubtitle(events: TetheredEvent[], now = new Date()): string | null {
  const next = events
    .filter((event) => event.enabled && event.date * 1000 > now.getTime())
    .sort((a, b) => a.date - b.date)[0];
  if (!next) return null;
  const date = new Date(next.date * 1000);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day =
    date.toDateString() === today.toDateString()
      ? "Today"
      : date.toDateString() === tomorrow.toDateString()
        ? "Tomorrow"
        : date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
          });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${actionTitle(next.action)} · ${day} at ${time}`;
}

export async function refreshEventsSubtitle(events?: TetheredEvent[]): Promise<void> {
  await launchCommand({
    name: "manage-events",
    type: LaunchType.Background,
    ...(events ? { context: { subtitle: nextEventSubtitle(events) } } : {}),
  }).catch(() => undefined);
}
