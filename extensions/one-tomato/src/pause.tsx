import { LaunchType, closeMainWindow, launchCommand, popToRoot } from "@raycast/api";
import { pauseSession } from "./controller";

export default () => {
  pauseSession();
  try {
    launchCommand({
      name: "one-tomato-menu-bar",
      type: LaunchType.UserInitiated,
    });
  } catch (e) {
    console.log(e);
  }
  popToRoot();
  closeMainWindow();
};
