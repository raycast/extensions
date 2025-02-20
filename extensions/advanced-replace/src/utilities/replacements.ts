import { Clipboard, showHUD, getSelectedText, popToRoot } from "@raycast/api";
import { Match, ReplacementOption } from "../types";

export const applyReplacements = (str: string, replacements: Match[]) =>
  replacements.reduce((acc, { key, match }) => acc.split(`{${key}}`).join(match), str);

type ResultType = "copy" | "paste";

export const performReplacement = async (selectedOption: ReplacementOption, resultType: ResultType = "copy") => {
  try {
    const selectedText = await getSelectedText().catch(() => null);
    const clipboardText = await Clipboard.readText();
    const content = selectedText || clipboardText || "";

    if (!content) {
      showHUD("No text found to replace.");
      return;
    }

    const matches: Match[] = [];

    selectedOption.regexItems.forEach((e) => {
      const currentMatches = content.match(new RegExp(e.regex, "m"));
      if (!currentMatches) return false;
      matches.push({ key: e.key, match: currentMatches?.[1] ?? currentMatches?.[0] });
    });

    if (!Array.isArray(matches) || matches.length < 1) {
      return showHUD(`No matches were found.`);
    }

    const output = applyReplacements(selectedOption.output, matches);

    Clipboard[resultType](output);
    showHUD(resultType === "copy" ? "Copied to clipboard." : "Pasted into place.");
    popToRoot();
  } catch (error) {
    showHUD(`Error: ${error}`);
  }
};
