import { Tool } from "@raycast/api";
import { actionCatalog } from "bettertouchtool/catalog";
import { parseActionParameterInputs, runAction } from "../ai-tools";
import { createBttClient } from "../btt";

type Input = {
  /** Exact numeric action ID returned by search-actions. Never invent or infer this value. */
  id: number;
  /** Only parameters returned by search-actions. Keep text verbatim; encode boolean, number, and JSON values as text. */
  parameters?: Array<{
    /** Exact parameter name returned by search-actions. */
    name: string;
    /** Value represented as text, following the type returned by search-actions. */
    value: string;
  }>;
};

export const confirmation: Tool.Confirmation<Input> = async ({ id, parameters }) => {
  const action = actionCatalog.byId(id);
  return {
    message: `Run the BetterTouchTool action “${action?.name ?? id}”?`,
    info: [
      { name: "Action ID", value: String(id) },
      { name: "Parameters", value: parameters?.length ? JSON.stringify(parameters) : undefined },
    ],
  };
};

/**
 * Run one BetterTouchTool built-in action. You must call search-actions first and pass its exact ID and parameter keys.
 */
export default function tool(input: Input) {
  const parsed = parseActionParameterInputs(input.id, input.parameters ?? []);
  if (!parsed.success) return parsed;
  return runAction(createBttClient(), { id: input.id, parameters: parsed.parameters });
}
