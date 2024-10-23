import { getPreferenceValues } from "@raycast/api";

type ExtensionPreferences = {
  /** Open Website by Default - Open JSR.io istead of showing the details */
  openWebsiteByDefault?: boolean;
};

export const preferences = getPreferenceValues<ExtensionPreferences>();

export default preferences;
