import { executeComposeWithPrompt } from "./api";
import { CommandTitle } from "./Command";
import { COMPOSE_PROMPTS } from "./compose-prompts";

export default async function main() {
  const config = COMPOSE_PROMPTS.FRENCH;
  await executeComposeWithPrompt(config.prompt, CommandTitle.COMPOSE_FRENCH);
}
