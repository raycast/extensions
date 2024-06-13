import { LaunchProps, getSelectedText } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export type CommandProps = LaunchProps<{ arguments: { word?: string } }>;

export const EUDIC_SCRIPT_COMMAND = {
  DIC: "show dic with word",
  CG: "show cg with word",
  WIKI: "show wiki with word",
  SPEAK: "speak word with word",
} as const;

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
