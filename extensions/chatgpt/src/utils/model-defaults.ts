import type { Command, Model } from "../type";

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: "",
  created_at: "",
  name: "Default",
  prompt: "You are a helpful assistant.",
  option: "gpt-5-nano",
  temperature: "1",
  enableReasoningEffortChange: false,
  reasoningEffort: "medium",
  pinned: false,
  vision: false,
};

export const COMMAND_MODEL_PREFIX = "command";
export const DEFAULT_AI_COMMAND_ID_PREFIX: string = "default";
export const FIX_SPELLING_AND_GRAMMAR_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-fix-spelling-and-grammar`;
export const IMPROVE_WRITING_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-improve-writing`;
export const DEFAULT_COMMANDS: Record<string, Command> = {
  [FIX_SPELLING_AND_GRAMMAR_COMMAND_ID]: {
    id: FIX_SPELLING_AND_GRAMMAR_COMMAND_ID,
    name: "Fix Spelling and Grammar",
    configurationMode: "independent",
    prompt:
      "You are an assistant that fixes spelling, grammar and punctuation. Don't insert any " +
      "extra information; only provide the corrected text. After receiving corrections, the user can request " +
      "clarifications, and you need to answer them in detail.",
    model: "gpt-5-nano",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  [IMPROVE_WRITING_COMMAND_ID]: {
    id: IMPROVE_WRITING_COMMAND_ID,
    name: "Improve Writing",
    configurationMode: "independent",
    prompt: `Act as a spelling corrector, content writer, and text improver/editor. Reply with the rewritten text.
After receiving corrections, the user can request clarifications, and you need to answer them in detail.
Strictly follow these rules:
- Correct spelling, grammar, and punctuation errors in the given text
- Enhance clarity and conciseness without altering the original meaning
- Divide lengthy sentences into shorter, more readable ones
- Eliminate unnecessary repetition while preserving important points
- Prioritize active voice over passive voice for a more engaging tone
- Opt for simpler, more accessible vocabulary when possible
- ALWAYS ensure the original meaning and intention of the given text
- ALWAYS detect and maintain the original language of the text
- ALWAYS maintain the existing tone of voice and style, e.g. formal, casual, polite, etc.
- NEVER surround the improved text with quotes or any additional formatting
- If the text is already well-written and requires no improvement, don't change the given text`,
    model: "gpt-5-nano",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  [`${DEFAULT_AI_COMMAND_ID_PREFIX}-summarize-webpage`]: {
    id: `${DEFAULT_AI_COMMAND_ID_PREFIX}-summarize-webpage`,
    name: "Summarize Webpage",
    configurationMode: "independent",
    prompt:
      "Read and summarize the main ideas and key points from this text. Summarize the information concisely and clearly.",
    model: "gpt-5-nano",
    temperature: "1",
    contentSource: "browserTab",
    isDisplayInput: false,
  },
};
