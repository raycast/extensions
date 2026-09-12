import { getEffects, setEffect } from "../lib/nanoleaf-client";

type Input = {
  /**
   * The name of the effect/scene to apply. The match is case-insensitive
   * but must otherwise match one of the device's available effects exactly.
   * If unsure which effects exist, call list-effects first.
   */
  effect: string;
};

export default async function tool(input: Input) {
  const effects = await getEffects();
  const match = effects.find((effect) => effect.toLowerCase() === input.effect.toLowerCase());
  if (!match) {
    throw new Error(`Effect "${input.effect}" not found. Available effects: ${effects.join(", ")}.`);
  }
  await setEffect(match);
  return `Effect set to "${match}".`;
}
