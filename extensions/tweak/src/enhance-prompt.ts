import { runPolish } from "./runner";
import { PROMPT_ENHANCER_PROMPT } from "./prompt-enhancer";

export default async function Command() {
  await runPolish(PROMPT_ENHANCER_PROMPT, "Prompt Enhanced", 0.4);
}
