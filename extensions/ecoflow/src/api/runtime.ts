import { getPreferenceValues } from "@raycast/api";
import type { ExtensionPreferences } from "../types/preferences";
import { EcoFlowClient } from "./client";

export function createEcoFlowClient(): EcoFlowClient {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return new EcoFlowClient({
    accessKey: preferences.accessKey,
    secretKey: preferences.secretKey,
  });
}
