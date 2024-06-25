import { LaunchProps, getSelectedText } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { EUDIC_SCRIPT_COMMAND } from "../constatnts";

export type CommandProps = LaunchProps<{ arguments: { word?: string } }>;

export type EudicScriptCommand = (typeof EUDIC_SCRIPT_COMMAND)[keyof typeof EUDIC_SCRIPT_COMMAND];

export const getWordWithDefaultSelect = async (word?: string) => {
  let result = word?.trim();

  if (!result) {
    try {
      result = await getSelectedText();
    } catch (e) {
      return "";
    }
  }

  return result;
};

export const execEudicScriptsWithWord = (command: EudicScriptCommand) => async (word?: string) => {
  const target = await getWordWithDefaultSelect(word);

  if (!target) return;

  await runAppleScript(
    `
    tell application "EuDic"
      activate
      ${command} "${target}"
    end tell
    `,
  );
};
