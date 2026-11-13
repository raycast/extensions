import { getVariable } from "../ai-tools";
import { createBttClient } from "../btt";

type Input = {
  /** Exact, case-sensitive BetterTouchTool variable name. Preserve punctuation and whitespace verbatim. */
  variableName: string;
};

/** Read a BetterTouchTool variable's value and type without changing it. */
export default function tool({ variableName }: Input) {
  return getVariable(createBttClient(), variableName);
}
