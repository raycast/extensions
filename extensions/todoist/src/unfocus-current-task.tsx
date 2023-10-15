import { launchCommand, LaunchType, showHUD, Cache } from "@raycast/api";

const cache = new Cache();

const command = async () => {
  cache.set("todoist.focusedTask", JSON.stringify({ id: "", content: "" }));

  await showHUD(`👋 No more focus`);

  try {
    launchCommand({ name: "menubar", type: LaunchType.UserInitiated });
  } catch (error) {
    /* empty */
  }
};

export default command;
