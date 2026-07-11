import { getSelectedFinderItems } from "@raycast/api";
import { runShellCommand } from "./lib/run-shell-command";
import { wrapWithErrorToast } from "./utils/wrap-with-error-toast";
import { getAlacrittyPreferences } from "./utils/get-alacritty-preferences";
import { Shell } from "./types/shell";

// if there's demand we could make this configurable, but the ideal solution is to set $EDITOR
const fallbackEditorPath = "/usr/bin/vim";

const getEditor = () => {
  const { shell } = getAlacrittyPreferences();
  // fish doesn't understand shell parameter expansion
  if (shell === Shell.Fish) {
    return `test -z "$EDITOR" && set EDITOR '${fallbackEditorPath}' ; $EDITOR`;
  }

  return `\${EDITOR:-${fallbackEditorPath}}`;
};

export default wrapWithErrorToast(async () => {
  const items = await getSelectedFinderItems();
  if (!items.length) {
    throw new Error("Could not get the selected Finder items");
  }

  const editor = getEditor();
  const paths = items.map((item) => `'${item.path}'`).join(" ");
  const command = `${editor} ${paths}`;
  await runShellCommand(command);
});
