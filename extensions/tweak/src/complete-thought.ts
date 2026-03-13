import { runPolish } from "./runner";
import { COMPLETE_MESSAGE_PROMPT } from "./prompts";

export default async function Command() {
  await runPolish(COMPLETE_MESSAGE_PROMPT, "Completed Thought", 0.7);
}
