import { getSelectedText } from "@raycast/api";
import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the current input to the command. Depending on the circumstances of the command's invocation, this could be the selected text, the parameter of a QuickLink, or direct input via method call.
 */
const InputPlaceholder: Placeholder = {
  name: "input",
  regex: /{{input}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    let input = context && "input" in context ? (context["input"] as string) : "";
    if (input == "") {
      try {
        input = await getSelectedText();
      } catch {
        input = "";
      }
    }
    return { result: input, input: input };
  },
  result_keys: ["input"],
  constant: true,
  fn: async () => (await InputPlaceholder.apply("{{input}}")).result,
  example: "Summarize this: {{input}}",
  description:
    "Replaced with the current input to the command. Depending on the circumstances of the command's invocation, this could be the selected text, the parameter of a QuickLink, or direct input via method call.",
  hintRepresentation: "{{input}}",
  fullRepresentation: "Query Input",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Device],
};

export default InputPlaceholder;
