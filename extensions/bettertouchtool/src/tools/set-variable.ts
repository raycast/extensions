import { Tool } from "@raycast/api";
import { setVariable, type SetVariableInput } from "../ai-tools";
import { createBttClient } from "../btt";

type Input = {
  /** Exact, case-sensitive BetterTouchTool variable name. Preserve punctuation and whitespace verbatim. */
  variableName: string;
  /** Exact value requested by the user, represented as text. Do not reformat it. */
  variableValue: string;
  /** Store the value as text or parse it as a finite number. Never infer "number" from formatting alone. */
  variableType: "string" | "number";
  /** Whether the value should survive a BetterTouchTool restart. Defaults to false. */
  persistent?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Set the BetterTouchTool variable “${input.variableName}”?`,
  info: [
    { name: "Value", value: input.variableValue },
    { name: "Type", value: input.variableType },
    { name: "Persistence", value: input.persistent ? "Persistent" : "Temporary" },
  ],
});

/** Set a BetterTouchTool variable only when the user explicitly asks to change it. */
export default function tool(input: Input) {
  return setVariable(createBttClient(), input as SetVariableInput);
}
