import { Mistral } from "@mistralai/mistralai";
import { getPreferenceValues } from "@raycast/api";

const { apiKey } = getPreferenceValues<ExtensionPreferences>();

export const client = new Mistral({ apiKey });
