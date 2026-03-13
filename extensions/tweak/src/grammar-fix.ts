import { runPolish } from "./runner";
import { GRAMMAR_PROMPT } from "./prompts";

export default async function Command() {
  await runPolish(GRAMMAR_PROMPT, "Grammar fixed", 0.1);
}
