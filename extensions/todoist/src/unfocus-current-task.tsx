import { popToRoot, closeMainWindow, launchCommand, LaunchType, showHUD, Cache } from "@raycast/api";

const cache = new Cache();

const command = async () => {
  cache.set("todoist.focusedTask", JSON.stringify({ id: "", content: "" }));

  await showHUD(`👋 No more focus`);

  launchCommand({ name: "menubar", type: LaunchType.Background });
  popToRoot();
  closeMainWindow();

  return null;
};

export default command;
