import { getPreferenceValues } from "@raycast/api";
import { EcoFlowClient } from "./client";

export function createEcoFlowClient(): EcoFlowClient {
  const preferences = getPreferenceValues<Preferences>();
  return new EcoFlowClient({
    accessKey: preferences.accessKey,
    secretKey: preferences.secretKey,
  });
}
