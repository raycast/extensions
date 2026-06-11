import { setBrightness } from "../lib/nanoleaf-client";

type Input = {
  /**
   * Target brightness as a whole number from 0 to 100, where 0 is off and
   * 100 is maximum. Map vague requests sensibly: "dim" ≈ 20, "low" ≈ 30,
   * "medium" ≈ 50, "bright" ≈ 80, "full" or "max" = 100.
   */
  brightness: number;
};

export default async function tool(input: Input) {
  const clamped = Math.min(Math.max(Math.round(input.brightness), 0), 100);
  await setBrightness(clamped);
  return `Brightness set to ${clamped}%.`;
}
