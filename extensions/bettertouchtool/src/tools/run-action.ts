import { Tool } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { createJXAScript } from "../constants";
import { returnErrorText, isErrorResponse } from "../api/utils";
import { runAppleScript } from "@raycast/utils";
import { Result } from "../types";

type Input = {
  /**
   * The ID of the action to run.
   */
  id: string;
  /**
   * The name of the action to run.
   */
  name: string;
  /**
   * The type of the action to run.
   *
   * This is a numeric value that identifies the action type in BetterTouchTool.
   * You MUST use the search-action tool first to find the correct type of the action.
   */
  type: number;
  /**
   * Some actions may require a parameter to be passed. If the action requires a parameter,
   * you should provide it as an object with name and value properties.
   *
   * For example, if search-action returns param: "BTTLaunchPath":
   * parameter: { name: "BTTLaunchPath", value: "/Applications/Safari.app" }
   */
  param?: {
    name: string;
    value: string;
  };
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  let message = `Are you sure you want to run the action "${input.name}" with ID "${input.id}"?`;

  if (input.param?.name && input.param?.value) {
    message += `\n\nParameter: ${input.param.name} = "${input.param.value}"`;
  }

  return { message };
};

/**
 * Run an action in BetterTouchTool.
 *
 * IMPORTANT: You MUST use the search-action tool first to find the correct action type.
 * IMPORTANT: Only use this tool if the user directly requests running an action.
 *
 * Example requests:
 * - "Run the action 12345"
 * - "Run 'expose' action"
 * - "Run right click action"
 *
 * Notice that each example explicitly mentions 'action'.
 * @param input
 */
export default async function tool(input: Input): Promise<Result<void>> {
  const { bttSharedSecret: secret } = getPreferenceValues();

  // Create the action definition object using createJXAScript
  const jxaCommand = createJXAScript((btt) => {
    return `
    var actionDefinition = {
      "BTTPredefinedActionType": ${input.type}
    };
    
    ${
      input.param?.name && input.param?.value
        ? `actionDefinition[${JSON.stringify(input.param.name)}] = ${JSON.stringify(input.param.value)};`
        : ""
    }
    
    try {
      return ${btt}.trigger_action(JSON.stringify(actionDefinition)${secret ? `, { shared_secret: ${JSON.stringify(secret)} }` : ""});
    } catch (error) {
      ${returnErrorText("Failed to run action", "error.message")}
    }`;
  });

  try {
    const result = await runAppleScript(jxaCommand, {
      language: "JavaScript",
    });

    if (isErrorResponse(result)) {
      const trimmedError = result.replace("error:", "").trim();
      return { status: "error", error: trimmedError };
    }

    return { status: "success" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { status: "error", error: errorMessage };
  }
}
