import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the name of the last command executed by the user.
 */
const PreviousCommandPlaceholder: Placeholder = {
  name: "previousCommand",
  regex: /{{(previousCommand|lastCommand)}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    if (context && "previousCommand" in context) {
      return { result: context["previousCommand"] as string, previousCommand: context["previousCommand"] };
    }
    return { result: "", previousCommand: "" };
  },
  result_keys: ["previousCommand"],
  constant: true,
  fn: async () => (await PreviousCommandPlaceholder.apply("{{previousCommand}}")).result,
  example: "Run command in background: {{{{previousCommand}}}}",
  description: "Replaced with the name of the last command executed.",
  hintRepresentation: "{{previousCommand}}",
  fullRepresentation: "Previous Command Name",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PreviousCommandPlaceholder;
