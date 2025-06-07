import { getPreferenceValues } from "@raycast/api";
import { createJXAScript } from "../constants";
import { runAppleScript } from "@raycast/utils";
import { returnErrorText, isErrorResponse } from "./utils";
import { Result } from "../types";

type Success = { type: "string"; value: string } | { type: "number"; value: number } | { type: "null" };

export async function getVariable(variableName: string): Promise<Result<Success>> {
  const { bttSharedSecret: secret } = getPreferenceValues();
  const secretParam = secret ? `, { shared_secret: ${JSON.stringify(secret)} }` : "";

  // Use a single JXA script to check both string and number variables
  const args = `${JSON.stringify(variableName)}${secretParam}`;
  const getVariableJXA = createJXAScript(
    (btt) => `
  try {
    // First try to get it as a string variable
    let stringValue;
    try {
      stringValue = ${btt}.get_string_variable(${args});
      
      // If the string variable exists, return it with type information
      if (stringValue !== null) {
        return JSON.stringify({ type: "string", value: stringValue });
      }
    } catch (stringError) {
      // If we get error -1708, it means the variable doesn't exist as a string
      // Just continue to check if it's a number variable
      if (!String(stringError).includes("Error: Message not understood")) {
        ${returnErrorText("Could not retrieve string variable", "stringError")};
      }
    }
    
    // If string variable doesn't exist or threw -1708 error, try number variable
    let numberValue = ${btt}.get_number_variable(${args});
    
    // Check if the result is null (variable doesn't exist)
    if (numberValue === null) {
      return JSON.stringify({ type: "null" });
    }
    
    // Return the number with type information
    return JSON.stringify({ type: "number", value: numberValue });
  } catch (e) {
    ${returnErrorText("Could not retrieve variable", "e")};
  }`,
  );

  try {
    const result = await runAppleScript(getVariableJXA, {
      language: "JavaScript",
    });

    if (isErrorResponse(result)) {
      const trimmedError = result.replace("error:", "AppleScript Error:").trim();
      return { status: "error", error: trimmedError };
    }

    // Parse the JSON result
    const parsedResult = JSON.parse(result);

    if (parsedResult.type === "null") {
      return { status: "success", data: { type: "null" } };
    } else if (parsedResult.type === "string") {
      return { status: "success", data: { type: "string", value: parsedResult.value } };
    } else if (parsedResult.type === "number") {
      return { status: "success", data: { type: "number", value: parsedResult.value } };
    }

    // This should never happen if the JXA script is working correctly
    return { status: "error", error: "Unknown variable type returned" };
  } catch (e) {
    if (e instanceof Error) {
      return { status: "error", error: e.message };
    }
    return { status: "error", error: "Unknown error" };
  }
}
