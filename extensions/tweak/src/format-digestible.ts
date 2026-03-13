import { runPolish } from "./runner";
import { FORMAT_DIGESTIBLE_PROMPT } from "./prompts";

export default async function Command() {
  await runPolish(FORMAT_DIGESTIBLE_PROMPT, "Formatted — Digestible Chunk");
}
