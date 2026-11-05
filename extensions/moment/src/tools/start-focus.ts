import type { Tool } from "@raycast/api";
import { startConfirmation } from "../lib/lines.ts";
import { runTool } from "../moment.ts";

type Input = {
  /**
   * The focus session's length in whole minutes, from 1 to 90. Give it only
   * when the person says a number of minutes. Otherwise leave it out: Moment
   * then uses its own length. Never choose a length for the person.
   */
  minutes?: number;
};

/** Skipped when the minutes would be refused, so the refusal comes before the person confirms. */
export const confirmation: Tool.Confirmation<Input> = async (input) => startConfirmation(input.minutes);

/**
 * Starts a focus session in Moment. If a focus session or break is already in
 * progress, Moment starts nothing and the error says what is running. Returns
 * the timer after the start.
 */
export default async function tool(input: Input) {
  return runTool("startFocus", input.minutes);
}
