import { Action, type Tool } from "@raycast/api";
import { snoozeCheck } from "../api";
import { monitorDashboardUrl, untilMinutesFromNow } from "../format";

type Input = {
  /** The Project ID (`prj_...`) that owns the Check. */
  projectId: string;
  /** The Check ID (`chk_...`) to snooze, obtained from `list-monitors` or `list-incidents`. */
  checkId: string;
  /** How many minutes to snooze alerts for (for example, 30, 60, 240, or 1440). */
  minutes: number;
  /** Optional Monitor name shown in the confirmation prompt. */
  monitorName?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Regular,
    message: `Snooze alerts${input.monitorName ? ` for "${input.monitorName}"` : ""} for ${input.minutes} minutes? Checks continue running while alert messages are held.`,
    info: [
      ...(input.monitorName ? [{ name: "Monitor", value: input.monitorName }] : []),
      { name: "Check ID", value: input.checkId },
      { name: "Duration", value: `${input.minutes} minutes` },
    ],
  };
};

/**
 * Snooze alerts for a Check in You Up? for the given number of minutes. Requires a Full API token.
 */
export default async function tool(input: Input) {
  const minutes = Math.max(1, Math.round(input.minutes));
  const untilIso = untilMinutesFromNow(minutes);
  const monitor = await snoozeCheck(input.projectId, input.checkId, untilIso);
  return {
    monitorId: monitor.id,
    monitorName: monitor.name,
    snoozedUntil: untilIso,
    dashboardUrl: monitorDashboardUrl(input.projectId, monitor.id),
  };
}
