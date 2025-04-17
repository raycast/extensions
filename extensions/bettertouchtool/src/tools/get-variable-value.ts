import { getVariable } from "../api";

type Input = {
  /**
   * The name of the variable to get from BetterTouchTool.
   */
  variableName: string;
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
 * Gets the value of a BetterTouchTool variable.
 */
export default async function tool(input: Input): Promise<Output> {
  const { variableName } = input;

  try {
    const result = await getVariable(variableName);

    if (result.status === "error") {
      return {
        status: "error",
        error: result.error,
      };
    }

    if (result.data.type === "null") {
      return {
        status: "success",
        message: `\`${variableName}\` is not set`,
      };
    }

    if (result.data.type === "string") {
      return {
        status: "success",
        message: `\`${variableName}\` is set to \`${result.data.value}\` **(string)**`,
      };
    }

    if (result.data.type === "number") {
      return {
        status: "success",
        message: `\`${variableName}\` is set to \`${result.data.value}\` **(number)**`,
      };
    }

    // This should never happen if the getVariable function is working correctly
    return {
      status: "error",
      error: "Unknown variable type returned",
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return {
      status: "error",
      error: errorMessage,
    };
  }
}
