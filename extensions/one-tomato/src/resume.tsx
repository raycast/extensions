import { LaunchType, closeMainWindow, launchCommand, popToRoot } from "@raycast/api";
import { resumeSession } from "./controller";

export default () => {
  resumeSession();
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
