import { LaunchProps, Toast, open, showToast } from "@raycast/api";
import { buildOrbitTimelineUrl, resolveTimelineDateParam } from "./lib/orbit";

/**
 * Opens the Orbit Timeline, optionally jumping to a specific date.
 *
 * When a date argument is provided, chrono-node parses it as natural language
 * and the resulting date is forwarded as the `date` query parameter. Whether
 * the full datetime or just the date portion is sent depends on whether the
 * user mentioned a time — if no time is explicitly given, Orbit receives only
 * the date so it can apply its own default time logic.
 *
 * @example
 * // No argument → orbit://timeline
 * Command({ arguments: { date: "" } })
 *
 * @example
 * // Date only → orbit://timeline?date=2026-02-24
 * Command({ arguments: { date: "last Tuesday" } })
 *
 * @example
 * // Date + time → orbit://timeline?date=2026-02-24T09:00:00
 * Command({ arguments: { date: "yesterday at 9am" } })
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenOrbitTimeline }>) {
  const rawDate = (props.arguments.date ?? "").trim();

  try {
    const dateParam = rawDate ? resolveTimelineDateParam(rawDate) : undefined;
    const url = buildOrbitTimelineUrl(dateParam);
    await open(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened Timeline",
      message: rawDate ? url : undefined,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Timeline",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
