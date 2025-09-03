import { useAI } from "@raycast/utils";
import { TRANSLATE_PROMPT } from "./constants.js";
import { shouldTranslate } from "./utils.js";

export function useTranslate(text: string, prompt = TRANSLATE_PROMPT) {
  return useAI(`${prompt}${text}`, { execute: shouldTranslate });
}
