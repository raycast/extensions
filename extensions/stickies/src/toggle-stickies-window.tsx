import { captureException, environment, LaunchType } from "@raycast/api";
import { showStickies } from "./utils/stickies-utils";

export default async () => {
  try {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showStickies(true);
    }
  } catch (e) {
    captureException(e);
  }
};
