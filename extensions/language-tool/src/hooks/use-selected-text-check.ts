import { Clipboard, getPreferenceValues, getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { checkTextWithAPI } from "../services/languagetool-api";
import {
  filterValidMatches,
  withoutOverlappingMatches,
} from "../utils/match-filter";
import type { CheckTextResponse } from "../types";

const EMPTY_RESULT: CheckTextResponse = {};

/**
 * The text to work on, and where it came from.
 *
 * Kept verbatim, never trimmed: what gets pasted back replaces the whole
 * selection, so trimming here would silently eat the leading and trailing
 * whitespace the user had.
 */
type InputText = { text: string; fromSelection: boolean };

export async function readInputText(): Promise<InputText> {
  try {
    const selected = await getSelectedText();
    if (selected.trim()) return { text: selected, fromSelection: true };
  } catch {
    // Nothing selected, or the selection could not be read; fall back below
  }

  const clipboard = (await Clipboard.readText()) ?? "";
  return {
    text: clipboard.trim() ? clipboard : "",
    fromSelection: false,
  };
}

/**
 * Reads the selected text once, then checks it in the given language. Changing
 * the language re-runs the check on the same text: the original selection is
 * no longer reachable once Raycast is in front.
 */
export function useSelectedTextCheck(language: string) {
  const preferences = getPreferenceValues<Preferences>();

  const {
    data: input,
    isLoading: isReadingText,
    revalidate: rereadSelection,
  } = usePromise(readInputText, []);
  const textChecked = input?.text ?? "";
  const fromSelection = input?.fromSelection ?? false;

  const {
    data: result,
    isLoading: isChecking,
    error,
  } = usePromise(
    async (text: string, languageCode: string) => {
      if (!text) return EMPTY_RESULT;

      const response = await checkTextWithAPI({
        text,
        language: languageCode,
        motherTongue: preferences.motherTongue,
        preferredVariants: preferences.preferredVariants,
        level: preferences.level,
        enabledRules: preferences.enabledRules,
        disabledRules: preferences.disabledRules,
        enabledCategories: preferences.enabledCategories,
        disabledCategories: preferences.disabledCategories,
        enabledOnly: preferences.enabledOnly,
        enableHiddenRules: preferences.enableHiddenRules,
        noopLanguages: preferences.noopLanguages,
        abtest: preferences.abtest,
        mode: preferences.mode,
        allowIncompleteResults: preferences.allowIncompleteResults,
        useragent: preferences.useragent,
      });

      // Overlaps are dropped here rather than downstream so that every
      // screen counts, marks and applies exactly the same set
      return withoutOverlappingMatches(filterValidMatches(response));
    },
    [textChecked ?? "", language],
    { execute: Boolean(textChecked) },
  );

  return {
    textChecked,
    // Where the text came from, which the replacement has to match: pasting
    // over a selection that is no longer there lands at the cursor instead.
    fromSelection,
    result: result ?? EMPTY_RESULT,
    isLoading: isReadingText || isChecking,
    error,
    // Raycast can bring a dismissed command back with everything as it was,
    // and gives a view no way to notice. This lets the reader ask for the
    // current selection instead of acting on the previous one.
    rereadSelection,
  };
}
