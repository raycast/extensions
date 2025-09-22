import { getPreferenceValues } from "@raycast/api";

/**
 * Preferences interface as defined in package.json.
 */
interface MondayPrefs {
  mondayEnabled?: boolean;
  mondayApiKey?: string;
  mondayBoardId?: string;
  mondayGroupId?: string;
  mondayColumnDate?: string;
  mondayColumnHours?: string;
  mondayColumnNotes?: string;
  mondayColumnPerson?: string;
}

const prefs = getPreferenceValues<MondayPrefs>();

/**
 * Configuration for Monday.com integration.
 *
 * Secrets are loaded from environment variables. Create a `.env` file in the workspace root
 * with the keys below and add that file to `.gitignore` so it is never committed.
 */
export const mondayConfig = {
  /** Enable or disable the integration without touching code. */
  enabled: prefs.mondayEnabled !== false,

  /** Personal API token for Monday.com */
  apiKey: prefs.mondayApiKey ?? process.env.MONDAY_API_KEY ?? "",

  /** Board ID where time entries should be created */
  boardId: prefs.mondayBoardId
    ? Number(prefs.mondayBoardId)
    : process.env.MONDAY_BOARD_ID
      ? Number(process.env.MONDAY_BOARD_ID)
      : 0,

  /** Group ID within the board */
  groupId: prefs.mondayGroupId ?? process.env.MONDAY_GROUP_ID ?? "",

  /** Mapping between our data and Monday.com column IDs */
  columns: {
    date: prefs.mondayColumnDate ?? process.env.MONDAY_COLUMN_DATE ?? "",
    hours: prefs.mondayColumnHours ?? process.env.MONDAY_COLUMN_HOURS ?? "",
    notes: prefs.mondayColumnNotes ?? process.env.MONDAY_COLUMN_NOTES ?? "",
    person: prefs.mondayColumnPerson ?? process.env.MONDAY_COLUMN_PERSON ?? "person",
  },
} as const;
