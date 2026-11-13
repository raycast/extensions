import { Tool } from "@raycast/api";

import { executeElsewhereCommandForAi } from "../command-runner";
import { normalizeCreateSpacePrompt } from "../control-url";

type Input = {
  /**
   * The user's complete natural-language description of the Space to create.
   *
   * Preserve the user's language and requested details. Include ambience, mood,
   * setting, and desired spatial sound sources when the user provides them. Do
   * not invent requirements or rewrite the request as implementation steps.
   */
  prompt: string;
};

export default async function createSpaceFromPrompt({ prompt }: Input) {
  let normalizedPrompt: string;
  try {
    normalizedPrompt = normalizeCreateSpacePrompt(prompt);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Describe the Space you want Elsewhere to create.");
  }

  await executeElsewhereCommandForAi({ kind: "space", action: "create", prompt: normalizedPrompt });
  return "A generated Space preview is ready and playing in Elsewhere. It is saved only after the user reviews and confirms it there.";
}

export const confirmation: Tool.Confirmation<Input> = async ({ prompt }) => ({
  message:
    "Start Glaze AI generation for this Space preview? This uses Glaze AI credits. The Space is created only after the user reviews and confirms it in Elsewhere.",
  info: [{ name: "Prompt", value: prompt }],
});
