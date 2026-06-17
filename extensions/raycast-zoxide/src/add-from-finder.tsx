import { showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { makeFriendly, pathFor } from "@utils/path-helpers";
import { promisify } from "util";
import { exec } from "child_process";
import { base64ShellSanitize } from "@utils/misc";

const asyncExec = promisify(exec);

// Returns the selected/open Finder folder, or "" when nothing is available.
const getFinderPath = async (): Promise<string> => {
  const finderPath = await runAppleScript(`
    tell application "Finder"
      if exists window 1 then
        set selectedItems to selection
        if (count of selectedItems > 0) then
          set selectedItem to item 1 of selectedItems
        else
          set selectedItem to ""
        end if

        if class of selectedItem is folder or class of selectedItem is disk then
          set currentFolder to selectedItem as string
        else
          set currentFolder to target of front window as string
        end if
        set currentPath to POSIX path of (currentFolder as text)
      else
        set currentPath to ""
      end if
    end tell
  `);
  return finderPath.trim();
};

// Prompts with the native macOS folder picker. Returns "" if the user cancels.
const chooseFolder = async (): Promise<string> => {
  try {
    // timeout: 0 disables the default 10s limit — the dialog blocks on the user.
    const chosen = await runAppleScript(
      `
      set chosenFolder to choose folder with prompt "Select a folder to add to zoxide"
      return POSIX path of chosenFolder
    `,
      { timeout: 0 },
    );
    return chosen.trim();
  } catch {
    return ""; // User cancelled the picker.
  }
};

const addToZoxide = async (folder: string) => {
  const { stderr } = await asyncExec(`zoxide add "${base64ShellSanitize(folder)}"`, {
    env: { PATH: pathFor("zoxide") },
  });
  if (stderr.length) throw new Error(stderr);
};

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Checking Finder…" });
  try {
    // Prefer the Finder selection / front window; otherwise prompt with a picker.
    let folder = await getFinderPath();
    if (!folder) {
      toast.title = "Opening folder picker…";
      folder = await chooseFolder();
    }
    folder = folder.replace(/\/$/, "");
    if (!folder) {
      await toast.hide(); // Nothing selected and the picker was cancelled.
      return;
    }

    toast.title = "Adding directory to zoxide...";
    await addToZoxide(folder);

    try {
      await launchCommand({ name: "search-directories", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error("Failed to launch search-directories:", error);
    }

    // Terminal states use a fresh awaited showToast instead of mutating `toast`.
    // The docs' mutate-to-completion pattern assumes the toast outlives the update,
    // but this is a no-view command: it returns right after, so a fire-and-forget
    // mutation can be lost as the command tears down. Awaiting keeps the process
    // alive until the toast is presented. (The progress updates above are safe —
    // each is followed by more awaited work.) Applies to the failure case too.
    await showToast({ style: Toast.Style.Success, title: "Added to zoxide", message: makeFriendly(folder) });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to add to zoxide" });
  }
}
