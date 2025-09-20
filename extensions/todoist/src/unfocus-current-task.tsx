import { showToast, Toast, Cache, closeMainWindow } from "@raycast/api";

import { refreshMenuBarCommand } from "./helpers/menu-bar";

const cache = new Cache();

const command = async () => {
  cache.set("todoist.focusedTask", JSON.stringify({ id: "", content: "" }));

  await closeMainWindow();
  await showToast({ style: Toast.Style.Success, title: "No more focused task" });

  try {
    refreshMenuBarCommand();
  } catch {
    /* empty */
  }
};

export default command;
