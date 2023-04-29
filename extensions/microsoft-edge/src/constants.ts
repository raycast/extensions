import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./interfaces";
const { useDev } = getPreferenceValues<Preferences>();
export const applicationName = useDev ? "Microsoft Edge Dev" : "Microsoft Edge";
export const defaultEdgeProfilePath = ["Application Support", applicationName];
export const defaultEdgeStatePath = ["Application Support", applicationName, "Local State"];
export const DEFAULT_EDGE_PROFILE_ID = "Default";
export const EDGE_PROFILE_KEY = "EDGE_PROFILE_KEY";
export const EDGE_PROFILES_KEY = "EDGE_PROFILES_KEY";

export const DownloadText = `
  # 🚨Error: Microsoft Edge browser is not installed
  ## This extension depends on Microsoft Edge browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Microsoft Edge browser.

  [Click here](https://www.microsoft.com/en-us/edge) if you want to download manually.
  
  [![Microsoft Edge](https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4nqTh)]()
`;

export const NoBookmarksText = `
# 🚨Error: Microsoft Edge browser has no bookmarks. Please add some bookmarks to continue using this command.

[![Microsoft Edge](https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4nqTh)]()
`;

export const NoCollectionsText = `
# 🚨Error: Microsoft Edge browser has no collections. Please add some collections to continue using this command.

[![Microsoft Edge](https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4nqTh)]()
`;

export const UnknownErrorText = `
# 🚨Error: Something happened while trying to run your command
  
[![Microsoft Edge](https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4nqTh)]()
`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const NOT_INSTALLED_MESSAGE = "Microsoft Edge not installed";
export const NO_BOOKMARKS_MESSAGE = "Microsoft Edge has no bookmarks.";
