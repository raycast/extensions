import { getPreferenceValues, open } from "@raycast/api";
import { Result, SetVariableValue } from "../types";

export async function setVariableUrl(
  variableName: string,
  variableValue: SetVariableValue,
  isPersistent: boolean,
): Promise<Result<void>> {
  try {
    const url = getUrlForSetVariable(variableName, variableValue.value, isPersistent, variableValue.type);

    await open(url);
    return { status: "success" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { status: "error", error: errorMessage };
  }
}

function getUrlForSetVariable(
  variableName: string,
  variableValue: string | number,
  isPersistent: boolean,
  valueType: "string" | "number",
): string {
  const { bttSharedSecret: secret } = getPreferenceValues();

  // Determine the endpoint based on persistence and type
  const persistence = isPersistent ? "persistent_" : "";
  const endpoint = `set_${persistence}${valueType}_variable`;

  // Build the parameters
  const params = [
    `variableName=${encodeURIComponent(variableName)}`,
    `to=${encodeURIComponent(String(variableValue))}`,
  ];

  if (secret) {
    params.push(`shared_secret=${encodeURIComponent(secret)}`);
  }

  return `btt://${endpoint}/?${params.join("&")}`;
}
