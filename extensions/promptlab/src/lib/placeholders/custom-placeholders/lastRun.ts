import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the response text of the previous run of the current command.
 */
const LastRunPLaceholder: Placeholder = {
  name: "lastRun",
  regex: /{{(lastRun|previousRun)}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    if (context && "lastRun" in context) {
      return { result: context["lastRun"] as string, lastRun: context["lastRun"] };
    }
    return { result: "", lastRun: "" };
  },
  result_keys: ["lastRun"],
  constant: true,
  fn: async () => (await LastRunPLaceholder.apply("{{lastRun}}")).result,
  example: "Compare these responses: First response: ###{{lastRun}}###\n\nSecond Response: ###{{prompt:some text}}###",
  description:
    "Replaced with the response text of the previous run of the current command. If the current command has not been run before, this will be replaced with an empty string.",
  hintRepresentation: "{{lastRun}}",
  fullRepresentation: "Last Run",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default LastRunPLaceholder;
