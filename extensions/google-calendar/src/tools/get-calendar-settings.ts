import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** Setting ID to read, such as timezone, locale, weekStart, or autoAddHangouts. Omit to list settings. */
  setting?: string;
  /** Maximum settings in a list page, 1-250. Defaults to 100. */
  maxResults?: number;
  /** Opaque nextPageToken from an earlier list call. */
  pageToken?: string;
};

const tool = async (input: Input) => {
  const calendar = getCalendarClient();
  if (input.setting) {
    const response = await calendar.settings.get({ setting: input.setting });
    return { id: response.data.id, value: response.data.value, etag: response.data.etag };
  }
  const maxResults = input.maxResults ?? 100;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 250) {
    throw new Error("maxResults must be a whole number from 1 to 250.");
  }
  const response = await calendar.settings.list({ maxResults, pageToken: input.pageToken });
  return {
    nextPageToken: response.data.nextPageToken,
    nextSyncToken: response.data.nextSyncToken,
    settings:
      response.data.items?.map((setting) => ({
        id: setting.id,
        value: setting.value,
        etag: setting.etag,
      })) ?? [],
  };
};

export default withGoogleAPIs(tool);
