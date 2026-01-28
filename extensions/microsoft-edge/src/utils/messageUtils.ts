import { getApplicationImage, getApplicationName, isStableVersion } from "./appUtils";

export const getDownloadText = () => `
  # 🚨Error: ${getApplicationName()} browser is not installed
  ## This extension requires ${getApplicationName()} browser.
  
  ${
    isStableVersion()
      ? `If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install ${getApplicationName()} browser.
        [Click here](https://www.microsoft.com/en-us/edge/download) if you want to download manually.`
      : "## Please install from [here](https://www.microsoft.com/en-us/edge/download/insider) manually."
  }
  
  ![${getApplicationName()}](${getApplicationImage()})
`;

export const getNoResourcesText = (resourcesName: string) => `
  # 🚨Error: ${getApplicationName()} browser has no ${resourcesName}.
  ![${getApplicationName()}](${getApplicationImage()})
`;

export const getNoBookmarksText = () => getNoResourcesText("bookmarks");

export const getNoCollectionsText = () => getNoResourcesText("collections");

export const getNoHistoryText = () => getNoResourcesText("history");

export const getUnknownErrorText = () => `
  # 🚨Error: Something went wrong!
    
  ![${getApplicationName()}](${getApplicationImage()})
`;

export const geNotInstalledMessage = () => `${getApplicationName()} is not installed`;

export const getNoBookmarksMessage = () => `${getApplicationName()} has no bookmarks.`;
