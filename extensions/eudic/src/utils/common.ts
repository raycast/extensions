import { LaunchProps, getSelectedText, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { EUDIC_SCRIPT } from "../constatnts";

export type CommandProps = LaunchProps<{ arguments: { word?: string } }>;

export type EudicScriptCommand = (typeof EUDIC_SCRIPT)[keyof typeof EUDIC_SCRIPT];

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

type EudicExecutor = { command: EudicScriptCommand; type: "APPLE_SCRIPT" } | { url: string; type: "URL_SCHEME" };

export const execEudicScriptsWithWord = (executor: EudicExecutor) => async (word?: string) => {
  const target = await getWordWithDefaultSelect(word);

  if (!target) return;

  if (executor.type === "APPLE_SCRIPT") {
    await runAppleScript(
      `
        tell application "EuDic"
          ${executor.command} "${target}"
        end tell
      `,
    );
  } else {
    open(`${executor.url}/${target}`);
  }
};
