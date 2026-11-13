import { Action, Tool } from "@raycast/api";
import { restoreDroppedShow } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { getToolSignal, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID of the dropped show to restore, from `search-shows`.
   */
  showTraktId: number;
};

type Output = {
  success: boolean;
  message: string;
  /** False when the show is restored but Trakt kept it off the calendar. */
  calendarRestored: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const label = await describeMedia("show", input.showTraktId);
  return {
    style: Action.Style.Regular,
    message: `Restore ${label}?`,
    info: [
      { name: "Show", value: label },
      { name: "What happens", value: "It returns to Continue Watching and the calendar." },
    ],
  };
};

/**
 * Restore a dropped show, undoing `drop-show`: it returns to Continue Watching and the calendar.
 * A confirmation dialog is shown to the user first.
 */
export default async function tool(input: Input): Promise<Output> {
  const label = await describeMedia("show", input.showTraktId);
  // `restoreDroppedShow` throws when Trakt removed nothing from the dropped list.
  const { calendarRestored } = await restoreDroppedShow(toolTraktClient, input.showTraktId, {
    signal: getToolSignal(),
  });

  return {
    success: true,
    calendarRestored,
    message: calendarRestored
      ? `Restored ${label} to Continue Watching and the calendar.`
      : `Restored ${label} to Continue Watching, but Trakt kept it off the calendar.`,
  };
}
