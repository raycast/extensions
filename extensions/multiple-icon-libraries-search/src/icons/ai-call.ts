import { AI } from "@raycast/api";

/** The one place Icon Search calls Raycast AI. `feature` names the caller, for copies that log calls. */
export function askAi(feature: string, prompt: string, options: AI.AskOptions = {}): Promise<string> {
  return AI.ask(prompt, options);
}
