import type { Tool } from "@raycast/api";
import { aiEditProjectText } from "../lib/ai-editor";
import { projectConfirmation, withAiConnection } from "../lib/ai-runtime";

type Input = {
  /** Exact project ID returned by list-projects. */
  projectId: string;
  /** Exact text element ID returned by list-project-text for this project. */
  elementId: string;
  /** Exact original text returned by list-project-text, preserving newlines. */
  expectedText: string;
  /** Replacement text requested by the user. Preserve intended line breaks. */
  text: string;
};
export const confirmation: Tool.Confirmation<Input> = (input) =>
  projectConfirmation(
    input.projectId,
    "Replace this text overlay and save the project? Edits will reopen it to verify the saved text.",
    [
      { name: "Current Text", value: input.expectedText },
      { name: "New Text", value: input.text },
    ],
  );
export default async function tool(input: Input) {
  return withAiConnection((config) => aiEditProjectText(config, input));
}
