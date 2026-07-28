import { calendar_v3 } from "@googleapis/calendar";
import { OrganizationListParams, serializeCalendarListEntry } from "../lib/calendar-resources";
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
  /** Opaque nextPageToken returned by an earlier list-calendars call. */
  pageToken?: string;
  /** Return only calendars where the current user has at least this access role. */
  minAccessRole?: "freeBusyReader" | "reader" | "writerWithoutPrivateAccess" | "writer" | "owner";
  /** For Google Workspace users, return only calendars belonging to their organization. */
  showOwnOrganizationOnly?: boolean;
};

const tool = async (input: Input) => {
  const calendar = getCalendarClient();
  const maxResults = input.maxResults ?? 100;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 250) {
    throw new Error("maxResults must be a whole number from 1 to 250.");
  }

  const requestParams: calendar_v3.Params$Resource$Calendarlist$List & OrganizationListParams = {
    showDeleted: input.showDeleted,
    showHidden: input.showHidden,
    maxResults,
    pageToken: input.pageToken,
    minAccessRole: input.minAccessRole,
    showOwnOrganizationOnly: input.showOwnOrganizationOnly,
  };

  const response = await calendar.calendarList.list(requestParams);

  return {
    nextPageToken: response.data.nextPageToken,
    nextSyncToken: response.data.nextSyncToken,
    calendars: response.data.items?.map(serializeCalendarListEntry) ?? [],
  };
};

export default withGoogleAPIs(tool);
