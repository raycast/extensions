import { LaunchType, closeMainWindow, launchCommand, popToRoot } from "@raycast/api";
import { createSession } from "./controller";

export default () => {
  createSession("longBreak");
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
