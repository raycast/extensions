import type { ParsedTaskText, Prefixes } from "./types";

const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const cleanupItemText = (
  text: string,
  items: string[],
  prefix: string,
): string => {
  items.forEach((l) => {
    if (l === "") {
      return;
    }
    const escaped = escapeRegExp(l);
    text = text
      .replace(new RegExp(`\\${prefix}'${escaped}' `, "ig"), "")
      .replace(new RegExp(`\\${prefix}'${escaped}'`, "ig"), "")
      .replace(new RegExp(`\\${prefix}"${escaped}" `, "ig"), "")
      .replace(new RegExp(`\\${prefix}"${escaped}"`, "ig"), "")
      .replace(new RegExp(`\\${prefix}${escaped} `, "ig"), "")
      .replace(new RegExp(`\\${prefix}${escaped}`, "ig"), "");
  });
  return text;
};

export const cleanupResult = (
  result: ParsedTaskText,
  prefixes: Prefixes,
): ParsedTaskText => {
  result.text = cleanupItemText(result.text, result.labels, prefixes.label);
  result.text =
    result.project !== null
      ? cleanupItemText(result.text, [result.project], prefixes.project)
      : result.text;
  result.text =
    result.priority !== null
      ? cleanupItemText(
          result.text,
          [String(result.priority)],
          prefixes.priority,
        )
      : result.text;
  result.text = result.text.trim();

  return result;
};
