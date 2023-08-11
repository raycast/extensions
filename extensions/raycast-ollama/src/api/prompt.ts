import { OllamaPromptFormat, OllamaPrompt } from "./types";

const promptTemplateFormats = new Map<string, OllamaPromptFormat>([
  [
    "raycast_orca:3b",
    { promptStart: "### System:\n", promptEnd: "\n### User:\n", tagEnd: "\n\n### Response:\n" } as OllamaPromptFormat,
  ],
  [
    "raycast_llama2:7b",
    { promptStart: "<s>[INST] <<SYS>>\n", promptEnd: "\n<</SYS>>\n", tagEnd: " [/INST]" } as OllamaPromptFormat,
  ],
  [
    "raycast_llama2:13b",
    { promptStart: "<s>[INST] <<SYS>>\n", promptEnd: "\n<</SYS>>\n", tagEnd: " [/INST]" } as OllamaPromptFormat,
  ],
  [
    "raycast_llama2:70b",
    { promptStart: "<s>[INST] <<SYS>>\n", promptEnd: "\n<</SYS>>\n", tagEnd: " [/INST]" } as OllamaPromptFormat,
  ],
]);

const promptTemplate = new Map<string, string>([
  [
    "ollama-casual",
    "Act as a writer. Make the following text more casual while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "ollama-code-explain",
    "Act as a developer. Explain the following code block step by step.\n\nOutput only with the commented code.\n",
  ],
  [
    "ollama-confident",
    "Act as a writer. Make the following text more confident while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "ollama-explain",
    "Act as a writer. Explain the following text in simple and concise terms.\n\nOutput only with the modified text.\n",
  ],
  [
    "ollama-fix-spelling-grammar",
    "Act as a writer. Fix the following text from spelling and grammar error.\n\nOutput only with the fixed text.\n",
  ],
  [
    "ollama-friendly",
    "Act as a writer. Make the following text more friendly while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "ollama-improve-writing",
    "Act as a writer. Improve the writing of the following text while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "ollama-longer",
    "Act as a writer. Make the following text longer and more rich while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "ollama-professional",
    "Act as a writer. Make the following text more professional while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "ollama-shorter",
    "Act as a writer. Make the following text shorter while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  ["ollama-translate", "Act as a translator. Translate the following text.\n\nOutput only with the translated text.\n"],
  [
    "ollama-tweet",
    "You are a content marketer who needs to come up with a short but succinct tweet. Make sure to include the appropriate hashtags and links. All answers should be in the form of a tweet which has a max size of 280 characters. Every instruction will be the topic to create a tweet about.\n\nOutput only with the modified text.\n",
  ],
]);

/**
 * Returns a `OllamaPrompt` containing the prompt and endTag.
 * @param {string} model - Model used for inference.
 * @param {string} prompt - Prompt to be used for inference.
 * @param {string} query - Query to be used for inference.
 * @returns {OllamaPrompt} Containing the prompt and endTag.
 */
export function GetCustomPrompt(model: string, prompt: string, query?: string): OllamaPrompt {
  const t = promptTemplateFormats.get(model);

  query = query ?? "";

  if (t === undefined) {
    throw new Error(`Prompt model ${model} not found`);
  }

  return {
    prompt: t.promptStart + prompt + t.promptEnd + query,
    tagEnd: t.tagEnd,
  } as OllamaPrompt;
}

/**
 * Returns a `OllamaPrompt` containing the prompt and endTag.
 * @param {string} model - Model used for inference.
 * @param {string} prompt - Prompt template to be used for inference.
 * @param {string} query - Query to be used for inference.
 * @returns {OllamaPrompt} Containing the prompt and endTag.
 */
export function GetPrompt(model: string, prompt: string, query: string): OllamaPrompt {
  const t = promptTemplateFormats.get(model);
  const p = promptTemplate.get(prompt);

  if (t === undefined) {
    throw new Error(`Prompt model ${model} not found`);
  }

  if (p === undefined) {
    throw new Error(`Prompt template ${prompt} not found`);
  }

  return {
    prompt: t.promptStart + p + t.promptEnd + query,
    tagEnd: t.tagEnd,
  } as OllamaPrompt;
}
