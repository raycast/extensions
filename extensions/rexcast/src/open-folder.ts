import { statSync } from "node:fs";
import { basename, dirname } from "node:path";
import { closeMainWindow, getSelectedFinderItems, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { rex, showSession } from "./lib/rex";

/** Folder (or the folder of the file) selected in Finder → new Rex session there. */
export default async () => {
  let dir: string;
  try {
    const [item] = await getSelectedFinderItems();
    if (!item) throw new Error("No selection");
    dir = statSync(item.path).isDirectory() ? item.path : dirname(item.path);
  } catch {
    await showFailureToast(new Error("Select a folder in Finder first"), { title: "Nothing selected" });
    return;
  }

  const name = basename(dir) || dir;
  let sessionId: string;
  try {
    sessionId = JSON.parse(await rex("new", name, "-c", dir, "--json")).session_id;
  } catch (e) {
    await showFailureToast(e, { title: "Could not open the folder in Rex" });
    return;
  }
  await closeMainWindow();
  // The session exists now: a failure to show it must not look like a failure to create it.
  try {
    await showSession(sessionId);
    await showHUD(`Rex: session “${name}”`);
  } catch (e) {
    await showFailureToast(e, {
      title: `Session “${name}” created, but Rex could not show it`,
      message: "Turn on Remote Control in Rex's settings to switch sessions from Raycast.",
    });
  }
};
