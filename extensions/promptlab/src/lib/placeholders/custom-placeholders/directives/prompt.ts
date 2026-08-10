import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import runModel from "../../../models/runModel";

/**
 * Replaces prompt placeholders with the response to the prompt.
 */
const PromptPlaceholder: Placeholder = {
  name: "prompt",
  regex: /{{prompt:(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}/g,
  apply: async (str: string) => {
    const prompt = str.match(/(?<=(prompt:))(([^{]|{(?!{)|{{[\\s\\S]*?}})*?)}}/)?.[2] || "";
    if (prompt.trim().length == 0) return { result: "" };
    const response = await runModel(prompt, prompt, "");
    return { result: response || "" };
  },
  constant: false,
  fn: async (text: string) => (await PromptPlaceholder.apply(`{{prompt:${text}}}`)).result,
  example: "{{prompt:Summarize {{url:https://example.com}}}}",
  description: "Replaced with the response to the prompt after running it in the background.",
  hintRepresentation: "{{prompt:...}}",
  fullRepresentation: "Sub-Prompt",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Custom, PlaceholderCategory.Meta],
};

export default PromptPlaceholder;
