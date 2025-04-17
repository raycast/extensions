import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { createJXAScript } from "../constants";
import { isErrorResponse, returnErrorText } from "./utils";
import { Result, SetVariableValue } from "../types";

export async function setVariableAppleScript(
  variableName: string,
  variableValue: SetVariableValue,
  isPersistent: boolean,
): Promise<Result<void>> {
  const { bttSharedSecret: secret } = getPreferenceValues();
  const secretParam = secret ? `, shared_secret: ${JSON.stringify(secret)}` : "";

  const persistence = isPersistent ? "persistent_" : "";
  const methodName = `set_${persistence}${variableValue.type}_variable`;

  const setVariableJXA = createJXAScript(
    (btt) => `
  try {
    return ${btt}.${methodName}(${JSON.stringify(variableName)}, { to: ${JSON.stringify(variableValue.value)}${secretParam} });
  } catch (e) {
    ${returnErrorText(`Could not set ${isPersistent ? "persistent" : "temporary"} ${variableValue.type} variable`, "e")};
  }`,
  );

  try {
    const result = await runAppleScript(setVariableJXA, {
      language: "JavaScript",
    });

    if (isErrorResponse(result)) {
      const trimmedError = result.replace("error:", "").trim();
      return { status: "error", error: trimmedError };
    }

    return { status: "success" };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { status: "error", error: errorMessage };
  }
}
