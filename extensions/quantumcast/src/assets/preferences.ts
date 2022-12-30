import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { userInfo } from "os";

/**
 * Fetch extension preferences
 */
const extensionPrefs: Preferences = getPreferenceValues<Preferences>();

/**
 * OS preferences
 */
const currentUser = userInfo();
export const userName = currentUser.username;
export const userHomeDir = currentUser.homedir;
export const applicationsFolder = "/Applications";

/**
 * Extension preferences
 */
export const mongoURL = extensionPrefs.mongoURL;
export const mongoDB = extensionPrefs.mongoDB;
export const cloudflowBaseUrl = extensionPrefs.cloudflowURL;
export const cloudflowPluginSuiteBaseUrl = extensionPrefs.cloudflowURL.replace(":9090", ":9091");
export const showSystemWhitepaper = extensionPrefs.showSystemWhitepaper;
export const userCompanyEmail = extensionPrefs.userEmail;
export const userCompanyShortname = userCompanyEmail.slice(0, userCompanyEmail.indexOf("@"));

/**
 * Command preferences - "Open Pack Manual"
 */
export const packzManualLanguage = extensionPrefs.packzManualLanguage;

/**
 * Command preferences - "Go To TRAC"
 */
export const tracColumns = extensionPrefs.tracColumns;
export const tracStates = extensionPrefs.tracStates;
export const tracStatesAll = "accepted, assigned, closed, info+needed, new, reopened, testing, waitingforbuild";
export const tracGrouping = extensionPrefs.tracGrouping;
export const tracOrderColumn = extensionPrefs.tracOrderColumn;
export const tracOrderColumnDescending = extensionPrefs.tracOrderColumnDescending;
