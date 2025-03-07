import { setVariableAppleScript } from "../api";
import { Result, SetVariableValue } from "../types";

type Input = {
  /**
   * The name of the variable to set in BetterTouchTool.
   */
  variableName: string;

  /**
   * The value to set for the variable.
   * For number variables, this will be converted to a number.
   * For string variables, this will be used as-is.
   */
  variableValue: string;

  /**
   * The type of variable to set. Should match type of variableValue.
   */
  variableType: "string" | "number";

  /**
   * Whether the variable should persist after BTT restarts.
   * Default is false (temporary).
   */
  isPersistent?: boolean;
};

type Output =
  | {
      status: "success";
      message: string;
    }
  | {
      status: "error";
      error: string;
    };

/**
 * Sets a value for the specified variable in BetterTouchTool.
 */
export default async function tool(input: Input): Promise<Output> {
  const { variableName, variableValue, variableType, isPersistent = false } = input;

  try {
    // Parse and validate the input
    const parseResult = parseInput(variableValue, variableType);

    if (!parseResult.success) {
      return {
        status: "error",
        error: parseResult.error,
      };
    }

    const result: Result<void> = await setVariableAppleScript(variableName, parseResult.value, isPersistent);

    return result.status === "error"
      ? {
          status: "error",
          error: result.error,
        }
      : {
          status: "success",
          message: `\`${variableName}\` set to \`${parseResult.value.value}\` **(${parseResult.value.type})**`,
        };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return {
      status: "error",
      error: errorMessage,
    };
  }
}

type ParseResult = { success: true; value: SetVariableValue } | { success: false; error: string };

function parseInput(variableValue: string, variableType: Input["variableType"]): ParseResult {
  if (variableType === "number") {
    const numValue = Number(variableValue);

    if (isNaN(numValue)) {
      // If number parsing fails, fall back to string type
      return {
        success: true,
        value: { type: "string", value: variableValue },
      };
    }

    return {
      success: true,
      value: { type: "number", value: numValue },
    };
  } else {
    return {
      success: true,
      value: { type: "string", value: variableValue },
    };
  }
}
