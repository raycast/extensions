import { showHUD, Cache } from "@raycast/api";

import { refreshMenuBarCommand } from "./helpers/menu-bar";

const cache = new Cache();

const command = async () => {
  cache.set("todoist.focusedTask", JSON.stringify({ id: "", content: "" }));

  await showHUD(`👋 No more focus`);

  try {
    refreshMenuBarCommand();
  } catch (error) {
    /* empty */
  }
};

export default command;
