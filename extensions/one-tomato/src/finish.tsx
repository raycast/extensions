import { LaunchType, closeMainWindow, launchCommand, popToRoot } from "@raycast/api";
import { resetSession } from "./controller";

export default () => {
  // if session is not null, and remaining time is 0, then return options, otherwise, reset
  resetSession();
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
