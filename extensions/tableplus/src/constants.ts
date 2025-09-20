import os from "node:os";
import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import fs from "fs";
import expandTidle from "expand-tilde";

export const EmptyGroupID = "__EMPTY__";
export const homeDirectory = os.homedir();
export const preferences = getPreferenceValues<ExtensionPreferences>();

export const appendPath = fs.existsSync(`${homedir()}/Library/Application Support/com.tinyapp.TablePlus-setapp/Data/`)
  ? "-setapp"
  : "";
export const isSetapp = appendPath.length > 0;
export const directoryPath = preferences.path
  ? expandTidle(preferences.path)
  : `${homedir()}/Library/Application Support/com.tinyapp.TablePlus${appendPath}/Data/`;

export const applicationPath = preferences.applicationPath
  ? expandTidle(preferences.applicationPath)
  : `/Applications/${isSetapp ? "Setapp" : ""}/TablePlus.app`;

export const plistVersionPath = applicationPath + "/Contents/Info.plist";
