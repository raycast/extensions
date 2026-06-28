import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the fully substituted text of the previous prompt.
 */
const PreviousPromptPlaceholder: Placeholder = {
  name: "previousPrompt",
  regex: /{{(previousPrompt|lastPrompt)}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    if (context && "previousPrompt" in context) {
      return { result: context["previousPrompt"] as string, previousPrompt: context["previousPrompt"] };
    }
    return { result: "", previousPrompt: "" };
  },
  result_keys: ["previousPrompt"],
  constant: true,
  fn: async () => (await PreviousPromptPlaceholder.apply("{{previousPrompt}}")).result,
  example: "Compare these prompts: First prompt: ###some text###\n\nSecond prompt: ###{{previousPrompt}}###",
  description: "Replaced with the fully substituted text of the previous prompt.",
  hintRepresentation: "{{previousPrompt}}",
  fullRepresentation: "Previous Command Prompt",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PreviousPromptPlaceholder;
