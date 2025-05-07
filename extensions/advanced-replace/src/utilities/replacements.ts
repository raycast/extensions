import { Clipboard, showHUD, getSelectedText, popToRoot, showToast, Toast } from "@raycast/api";
import { Match, Entry, EntryCutPaste, EntryDirectReplace } from "../types";

export const applyReplacements = (str: string, replacements: Match[]) =>
  replacements.reduce((acc, { key, match }) => acc.split(`{${key}}`).join(match), str);

type ResultType = "copy" | "paste";

export const performReplacement = (entry: Entry, resultType: ResultType) => {
  if (entry.type === "directReplace") {
    performDirectReplacement(entry, resultType);
  } else {
    performCutPasteReplacement(entry, resultType);
  }
};

export const performDirectReplacement = async (entry: EntryDirectReplace, resultType: ResultType = "copy") => {
  try {
    const selectedText = await getSelectedText().catch(() => null);
    const clipboardText = await Clipboard.readText();
    const content = selectedText || clipboardText || "";

    if (!content) {
      showHUD("No text found to replace.");
      return;
    }

    let output = content;

    entry.regexItems.forEach((e) => {
      if (!e.regex) {
        showToast({ title: "Action cancelled", message: "No regex was entered.", style: Toast.Style.Failure });
        return;
      }

      if (!e.replacement) {
        showToast({ title: "Action cancelled", message: "No replacement was entered.", style: Toast.Style.Failure });
        return;
      }

      output = output.replace(
        new RegExp(
          e.regex,
          "" + (e.matchGlobally ? "g" : "") + (e.matchCaseInsensitive ? "i" : "") + (e.matchMultiline ? "m" : ""),
        ),
        e.replacement,
      );
    });

    if (output === content) {
      return showHUD(`No matches were found.`);
    }

    Clipboard[resultType](output);
    showHUD(resultType === "copy" ? "Copied to clipboard." : "Pasted into place.");
    popToRoot();
  } catch (error) {
    showHUD(`Error: ${error}`);
  }
};

export const performCutPasteReplacement = async (entry: EntryCutPaste, resultType: ResultType = "copy") => {
  try {
    const selectedText = await getSelectedText().catch(() => null);
    const clipboardText = await Clipboard.readText();
    const content = selectedText || clipboardText || "";

    if (!content) {
      showHUD("No text found to replace.");
      return;
    }

    const matches: Match[] = [];

    entry.regexItems.forEach((e) => {
      const currentMatches = content.match(new RegExp(e.regex, "m"));
      if (!currentMatches) return false;
      matches.push({ key: e.key, match: currentMatches?.[1] ?? currentMatches?.[0] });
    });

    if (!Array.isArray(matches) || matches.length < 1) {
      return showHUD(`No matches were found.`);
    }

    const output = applyReplacements(entry.output, matches);

    Clipboard[resultType](output);
    showHUD(resultType === "copy" ? "Copied to clipboard." : "Pasted into place.");
    popToRoot();
  } catch (error) {
    showHUD(`Error: ${error}`);
  }
};
