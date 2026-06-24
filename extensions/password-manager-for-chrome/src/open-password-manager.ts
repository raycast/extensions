import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { openChromePasswordManager } from "./lib/open-chrome";

type Preferences = {
  chromeExecutable?: string;
};

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenPasswordManager }>) {
  const preferences = getPreferenceValues<Preferences>();
  try {
    await openChromePasswordManager(props.arguments.query, preferences.chromeExecutable);
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to Open Chrome Password Manager",
    });
  }
}
