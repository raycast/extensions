import { ALL_SWITCH_NAMES } from "../lib/constants";
import { klack } from "../lib/klack";

type Input = {
  /** One of Klack's switch sets. Use "None" to disable typing sounds. */
  switch: "None" | "Japanese Black" | "Crystal Purple" | "Oreo" | "Cardboard" | "Milky Yellow" | "Super Red" | "Cream";
};

export default async function tool(input: Input): Promise<string> {
  // Runtime guard: LLMs may supply unknown switch names.
  if (!ALL_SWITCH_NAMES.includes(input.switch)) {
    return `Unknown switch "${input.switch}". Valid options: ${ALL_SWITCH_NAMES.join(", ")}.`;
  }
  const current = await klack.currentSwitch();
  if (current.toLowerCase() === input.switch.toLowerCase()) {
    return input.switch === "None"
      ? "Typing sounds were already disabled."
      : `Klack was already using ${input.switch}.`;
  }
  await klack.setSwitch(input.switch);
  return input.switch === "None" ? "Typing sounds disabled." : `Switch set to ${input.switch}.`;
}
