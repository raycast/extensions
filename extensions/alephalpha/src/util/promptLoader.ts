export interface Prompts {
  [key: string]: string;
}

const prompts: Prompts = {
  summarize:
    "Read and summarize the main ideas and key points from this text. Summarize the information concisely and clearly. Do not include any extra information, NO introductory comment of the task is needed.",
  improveWriting:
    "Act as a spelling corrector, content writer, and text improver/editor. Reply with the rewritten text.\nAfter receiving corrections, the user can request clarifications, and you need to answer them in detail.\nStrictly follow these rules:\n- Correct spelling, grammar, and punctuation errors in the given text\n- Enhance clarity and conciseness without altering the original meaning\n- Divide lengthy sentences into shorter, more readable ones\n- Eliminate unnecessary repetition while preserving important points\n- Prioritize active voice over passive voice for a more engaging tone\n- Opt for simpler, more accessible vocabulary when possible\n- ALWAYS ensure the original meaning and intention of the given text\n- ALWAYS detect and maintain the original language of the text\n- ALWAYS maintain the existing tone of voice and style, e.g. formal, casual, polite, etc.\n- NEVER surround the improved text with quotes or any additional formatting\n- If the text is already well-written and requires no improvement, don't change the given text",
};

/**
 * Get a prompt by key
 * @param key The prompt key defined in prompts.json
 * @returns The prompt text
 */
export function getPrompt(key: string): string {
  if (!prompts[key]) {
    throw new Error(`Prompt "${key}" not found`);
  }
  return prompts[key];
}
