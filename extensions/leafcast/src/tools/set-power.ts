import { setPower } from "../lib/nanoleaf-client";

type Input = {
  /**
   * Whether to turn the Nanoleaf panels on (true) or off (false).
   */
  on: boolean;
};

export default async function tool(input: Input) {
  await setPower(input.on);
  return `Lights turned ${input.on ? "on" : "off"}.`;
}
