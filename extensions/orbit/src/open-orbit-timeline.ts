import { openMemoryMachineUrl, showMemoryMachineError } from "./lib/installed-app";
import { LaunchProps, Toast, showToast } from "@raycast/api";
import { buildMemoryMachineHistoryUrl, resolveHistoryDateParam } from "./lib/memory-machine";

/**
 * Opens the Memory Machine History, optionally jumping to a specific date.
 *
 * When a date argument is provided, chrono-node parses it as natural language
 * and the resulting date is forwarded as the `date` query parameter. Whether
 * the full datetime or just the date portion is sent depends on whether the
 * user mentioned a time — if no time is explicitly given, Memory Machine receives only
 * the date so it can apply its own default time logic.
 *
 * @example
 * // No argument → memorymachine://history
 * Command({ arguments: { date: "" } })
 *
 * @example
 * // Date only → memorymachine://history?date=2026-02-24
 * Command({ arguments: { date: "last Tuesday" } })
 *
 * @example
 * // Date + time → memorymachine://history?date=2026-02-24T09:00:00
 * Command({ arguments: { date: "yesterday at 9am" } })
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenOrbitTimeline }>) {
  const rawDate = (props.arguments.date ?? "").trim();

  try {
    const dateParam = rawDate ? resolveHistoryDateParam(rawDate) : undefined;
    const url = buildMemoryMachineHistoryUrl(dateParam);
    await openMemoryMachineUrl(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened History",
      message: rawDate ? url : undefined,
    });
  } catch (error) {
    await showMemoryMachineError(error, "Could not open History", () => Command(props));
  }
}
