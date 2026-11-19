import { searchNamedTriggers, type NamedTriggerSearchInput } from "../ai-tools";
import { createBttClient } from "../btt";

type Input = {
  /** Words from the trigger name, containing group, or assigned action. Omit to list triggers. */
  query?: string;
  /** Filter by enabled state. Use "enabled" before choosing a trigger to run. Defaults to "all". */
  status?: "all" | "enabled" | "disabled";
  /** Maximum results to return, from 1 through 25. Defaults to 10. */
  limit?: number;
};

/**
 * Find BetterTouchTool named triggers and their exact UUIDs. Use this before run-named-trigger; never invent a UUID.
 */
export default function tool(input: Input) {
  return searchNamedTriggers(createBttClient(), input as NamedTriggerSearchInput);
}
