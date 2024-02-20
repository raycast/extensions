import { FileSystemItem, getSelectedFinderItems } from "@raycast/api";
import { lstat } from "fs/promises";
import { dirname } from "path";
import { wrapWithErrorToast } from "./utils/wrap-with-error-toast";
import { runShellCommand } from "./lib/run-shell-command";
import { getAlacrittyPreferences } from "./utils/get-alacritty-preferences";

const openFolder = async (item: FileSystemItem) => {
  const dir = (await lstat(item.path)).isDirectory() ? item.path : dirname(item.path);
  // ideally we'd be able to use $SHELL instead, but it's only set in login shells
  const { shellPath } = getAlacrittyPreferences();
  const command = `cd '${dir}' && ${shellPath}`;
  return await runShellCommand(command);
};

export default wrapWithErrorToast(async () => {
  const items = await getSelectedFinderItems();
  if (!items.length) {
    throw new Error("Could not get the selected Finder items");
  }

  await Promise.all(items.map(openFolder));
});
