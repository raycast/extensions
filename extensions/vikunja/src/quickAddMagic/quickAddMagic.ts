import { parseDate } from "./dateParser";
import { PREFIXES, PrefixMode } from "./prefixes";
import {
  getItemsFromPrefix,
  getLabelsFromPrefix,
  getProjectFromPrefix,
} from "./prefixParser";
import { getPriority } from "./priorityParser";
import { getRepeats } from "./repeatParser";
import { cleanupItemText, cleanupResult } from "./textCleanup";
import type { ParsedTaskText } from "./types";

export const parseTaskText = (
  text: string,
  prefixesMode: PrefixMode = PrefixMode.Default,
  now: Date = new Date(),
): ParsedTaskText => {
  const result: ParsedTaskText = {
    text: text,
    date: null,
    labels: [],
    project: null,
    priority: null,
    assignees: [],
    repeats: null,
  };

  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")))
  ) {
    result.text = text.slice(1, -1);
    return result;
  }

  const prefixes = PREFIXES[prefixesMode];
  if (prefixes === undefined) {
    return result;
  }

  result.labels = getLabelsFromPrefix(text, prefixesMode) ?? [];
  result.text = cleanupItemText(result.text, result.labels, prefixes.label);

  result.project = getProjectFromPrefix(result.text, prefixesMode);
  result.text =
    result.project !== null
      ? cleanupItemText(result.text, [result.project], prefixes.project)
      : result.text;

  result.priority = getPriority(result.text, prefixes.priority);
  result.text =
    result.priority !== null
      ? cleanupItemText(
          result.text,
          [String(result.priority)],
          prefixes.priority,
        )
      : result.text;

  result.assignees = getItemsFromPrefix(result.text, prefixes.assignee);

  const { textWithoutMatched, repeats } = getRepeats(result.text);
  result.text = textWithoutMatched;
  result.repeats = repeats;

  const { newText, date } = parseDate(result.text, now);
  result.text = newText;
  result.date = date;

  return cleanupResult(result, prefixes);
};
