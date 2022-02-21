import { getPreferenceValues } from "@raycast/api";
import V2EX from "@chyroc/v2ex-api";

const preferenceValues = getPreferenceValues() as { token: string };
export const v2exCli = new V2EX({ token: preferenceValues.token });
export const isInvalidToken = (e: any) => {
  return `${e}`.includes("Invalid token");
};
export const invalidTokenHelper = "Invalid Token Detected - Go to Extensions → v2ex";
