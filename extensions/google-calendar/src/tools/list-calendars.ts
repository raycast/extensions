import { calendar_v3 } from "@googleapis/calendar";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /**
   * Whether to include deleted calendars in the result
   *
   * @default false
   *
   * @remarks
   * If true, deleted calendars will be included in the result.
   */
  showDeleted?: boolean;
  /**
   * Whether to include hidden calendars in the result
   *
   * @default false
   *
   * @remarks
   * If true, hidden calendars will be included in the result.
   */
  showHidden?: boolean;
  /**
   * Maximum number of calendars to return
   *
   * @default 10
   * @minimum 1
   * @maximum 250
   *
   * @remarks
   * The Google Calendar API has a maximum limit of 250 calendars per request.
   */
  maxResults?: number;
};

const tool = async (input: Input) => {
  const calendar = getCalendarClient();
  const maxResults = input.maxResults ? Math.max(1, Math.min(250, input.maxResults)) : 10;

  const requestParams: calendar_v3.Params$Resource$Calendarlist$List = {
    showDeleted: input.showDeleted,
    showHidden: input.showHidden,
    maxResults,
  };

  const response = await calendar.calendarList.list(requestParams);

  return (
    response.data.items?.map((calendar) => ({
      id: calendar.id,
      name: calendar.summary,
      description: calendar.description,
      primary: calendar.primary,
      visible: calendar.selected,
      accessRole: calendar.accessRole,
    })) || []
  );
};

export default withGoogleAPIs(tool);
