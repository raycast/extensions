export const ODIN_SOURCE_URL = "http://www.odin.dk/112puls/";
export const ODIN_SOURCE_INDICATION = "Kilde: www.odin.dk/112puls";

export const ODIN_HTML_ALARMS_TABLE_ID = "GridView1";
export const ODIN_HTML_ALARMS_TABLE_BODY_CLASS = "tbody";
export const ODIN_HTML_ALARM_DATE_FORMAT = "DD-MM-YYYY HH:mm:ss";
export const ODIN_HTML_ALARM_UPDATED_AT_REGEX =
  "[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]";

export const ODIN_STRINGS_NO_ALARMS_FOUND = "No alarms found.";
export const ODIN_STRINGS_PREPAREDNESS = "preparedness";
export const ODIN_STRINGS_STATION = "station";
export const ODIN_STRINGS_ALARM_RECEIVED = "alarm received";
export const ODIN_STRINGS_EMERGENCY = "emergency";
export const ODIN_STRINGS_SEARCH_PLACEHOLDER = `Search by ${ODIN_STRINGS_PREPAREDNESS}, ${ODIN_STRINGS_STATION}, ${ODIN_STRINGS_EMERGENCY} or ${ODIN_STRINGS_ALARM_RECEIVED}`;
export const ODIN_STRINGS_LASTUPDATED = (lastUpdated: string | null) => `Updated at ${lastUpdated}`;
