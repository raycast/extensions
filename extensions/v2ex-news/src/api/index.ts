import { getPreferenceValues } from "@raycast/api";
import V2EX from "@chyroc/v2ex-api";

const preferenceValues = getPreferenceValues() as { token: string };
export const v2exCli = new V2EX({ token: preferenceValues.token });
