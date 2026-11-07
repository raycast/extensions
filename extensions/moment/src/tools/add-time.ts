import type { Tool } from "@raycast/api";
import { addTimeConfirmation } from "../lib/lines.ts";
import { runTool } from "../moment.ts";

type Input = {
  /**
   * Whole minutes to add, from 1 to 90. Give it only when the person says how
   * many. Otherwise leave it out: Moment then adds 5 minutes.
   */
  minutes?: number;
};

/** Skipped when the minutes would be refused, so the refusal comes before the person confirms. */
export const confirmation: Tool.Confirmation<Input> = async (input) => addTimeConfirmation(input.minutes);

/**
 * Adds minutes to the focus session or break in progress. A session runs for
 * 90 minutes at most, so Moment may add less. Returns the timer after it.
 */
export default async function tool(input: Input) {
  return runTool("addTime", input.minutes);
}
