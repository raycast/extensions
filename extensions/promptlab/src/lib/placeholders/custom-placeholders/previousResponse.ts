import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the text of the AI's previous response.
 */
const PreviousResponsePlaceholder: Placeholder = {
  name: "previousResponse",
  regex: /{{(previousResponse|lastResponse|previousOutput|lastOutput)}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    if (context && "previousResponse" in context) {
      return { result: context["previousResponse"] as string, previousResponse: context["previousResponse"] };
    }
    return { result: "", previousResponse: "" };
  },
  result_keys: ["previousResponse"],
  constant: true,
  fn: async () => (await PreviousResponsePlaceholder.apply("{{previousResponse}}")).result,
  example:
    "Compare these responses: First response: ###{{prompt:some text}}###\n\nSecond Response: ###{{previousResponse}}###",
  description: "Replaced with the text of the AI's previous response.",
  hintRepresentation: "{{previousResponse}}",
  fullRepresentation: "Previous Command Response",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PreviousResponsePlaceholder;
