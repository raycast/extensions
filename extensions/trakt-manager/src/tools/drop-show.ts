import { Action, Tool } from "@raycast/api";
import { dropShow } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { getToolSignal, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID of the show to drop, from `search-shows` or `get-up-next`.
   */
  showTraktId: number;
};

type Output = {
  success: boolean;
  message: string;
  /** False when the show was dropped but Trakt kept it on the calendar. */
  calendarHidden: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const label = await describeMedia("show", input.showTraktId);
  return {
    style: Action.Style.Destructive,
    message: `Drop ${label}?`,
    info: [
      { name: "Show", value: label },
      {
        name: "What happens",
        value: "It leaves Continue Watching and the calendar. History and ratings are kept, and it can be restored.",
      },
    ],
  };
};

/**
 * Drop a show, as Trakt's "Drop show": it leaves Continue Watching and the calendar without touching history
 * or ratings. A confirmation dialog is shown to the user first.
 */
export default async function tool(input: Input): Promise<Output> {
  const label = await describeMedia("show", input.showTraktId);
  // `dropShow` throws when Trakt reports nothing added to the dropped list.
  const { calendarHidden } = await dropShow(toolTraktClient, input.showTraktId, { signal: getToolSignal() });

  return {
    success: true,
    calendarHidden,
    message: calendarHidden
      ? `Dropped ${label}: it left Continue Watching and the calendar.`
      : `Dropped ${label} from Continue Watching, but Trakt kept it on the calendar.`,
  };
}
