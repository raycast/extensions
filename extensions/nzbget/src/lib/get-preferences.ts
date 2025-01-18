import { getPreferenceValues, Icon } from "@raycast/api";
import { join } from "node:path";

type Preferences = {
  url: string;
  username: string;
  password: string;
};

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getAPIURL(path: string) {
  const preferences = getPreferences();
  const u = new URL(join(`/${preferences.username}:${preferences.password}`, path), preferences.url);
  return u.href;
}

// QUEUED - queued for download;
// PAUSED - paused;
// DOWNLOADING - item is being downloaded;
// FETCHING - nzb-file is being fetched from URL (Kind=URL);
// PP_QUEUED - queued for post-processing (completely downloaded);
// LOADING_PARS - stage of par-check;
// VERIFYING_SOURCES - stage of par-check;
// REPAIRING - stage of par-check;
// VERIFYING_REPAIRED - stage of par-check;
// RENAMING - processed by par-renamer;
// UNPACKING - being unpacked;
// MOVING - moving files from intermediate directory into destination directory;
// EXECUTING_SCRIPT - executing post-processing script;
// PP_FINISHED - post-processing is finished, the item is about to be moved to history.
export function getDownloadIcon(status: string) {
  if (status === "DOWNLOADING") return Icon.Download;
  if (status === "QUEUED") return Icon.Clock;
  if (status === "PAUSED") return Icon.Pause;
  if (status === "FETCHING") return Icon.Download;
  if (status === "PP_QUEUED") return Icon.Clock;
  if (status === "LOADING_PARS") return Icon.Clock;
  if (status === "VERIFYING_SOURCES") return Icon.Clock;
  if (status === "REPAIRING") return Icon.WrenchScrewdriver;
  if (status === "VERIFYING_REPAIRED") return Icon.WrenchScrewdriver;
  if (status === "RENAMING") return Icon.Move;
  if (status === "UNPACKING") return Icon.Maximize;
  if (status === "MOVING") return Icon.Clock;
  if (status === "EXECUTING_SCRIPT") return Icon.Clock;
  if (status === "PP_FINISHED") return Icon.Clock;
  return Icon.Circle;
}
