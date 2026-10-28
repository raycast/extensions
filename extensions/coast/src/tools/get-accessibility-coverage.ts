import { getAccessibilityCoverage } from "../coast";

type Input = {
  /**
   * Frame ID whose stored accessibility capture should be audited.
   */
  frameId: number;
};

/**
 * Audit which accessibility attributes Coast stored for a frame and which capture keys were absent. Use for Coast capture diagnostics, not ordinary content recall.
 */
export default async function tool(input: Input) {
  return getAccessibilityCoverage(input.frameId);
}
