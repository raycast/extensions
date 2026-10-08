import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  primaryAction: "copy" | "paste";
  primaryActionTarget: "definition" | "term" | "both";
  pasteFormat?: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getPrimaryAction(): "copy" | "paste" {
  return getPreferences().primaryAction;
}

export function getPrimaryActionTarget(): "definition" | "term" | "both" {
  return getPreferences().primaryActionTarget;
}

export function getPasteFormat(): string | undefined {
  return getPreferences().pasteFormat;
}

export function getContentForTarget(
  term: string,
  definition: string,
  target: "definition" | "term" | "both",
): string {
  switch (target) {
    case "definition":
      return definition;
    case "term":
      return term;
    case "both":
      return `${term}: ${definition}`;
    default:
      return definition;
  }
}

export function getFormattedContent(
  term: string,
  definition: string,
  target: "definition" | "term" | "both",
): string {
  const pasteFormat = getPasteFormat();

  // If custom paste format is defined and target is "both", use the custom format
  if (pasteFormat && target === "both") {
    return pasteFormat
      .replace(/{term}/g, term)
      .replace(/{definition}/g, definition);
  }

  // Otherwise use the default format
  return getContentForTarget(term, definition, target);
}
