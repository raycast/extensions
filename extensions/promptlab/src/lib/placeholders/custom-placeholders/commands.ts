import { LocalStorage } from "@raycast/api";
import { filterString } from "../../context-utils";
import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the comma-separated list of names of all installed PromptLab commands.
 */
const CommandsPlaceholder: Placeholder = {
  name: "commands",
  regex: /{{commands}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    if (context && "commands" in context) {
      return { result: context["commands"] as string, commands: context["commands"] as string };
    }

    const storedItems = await LocalStorage.allItems();
    const commands = filterString(Object.keys(storedItems).join(", "));
    return { result: commands, commands: commands };
  },
  result_keys: ["commands"],
  constant: true,
  fn: async () => (await CommandsPlaceholder.apply("{{commands}}")).result,
  example: "Based on this list of AI commands, suggest some new ones I could create: {{commands}}",
  description: "Replaced with the comma-separated list of names of all installed PromptLab commands.",
  hintRepresentation: "{{commands}}",
  fullRepresentation: "List of PromptLb Commands",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default CommandsPlaceholder;
