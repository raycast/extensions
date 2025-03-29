import { Mistral } from "@mistralai/mistralai";
import { getPreferenceValues } from "@raycast/api";

const { apiKey } = getPreferenceValues<{ apiKey: string }>();

export const client = new Mistral({ apiKey });
