import { getPreferenceValues } from "@raycast/api";
import { loadDefaultGatewayCredentialsFile } from "./credentials-file";
import { mergeGatewayCredentials } from "./gateway-config";
import { Preferences, Result, GatewayError } from "./types";

function fromRaycast(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  return {
    gatewayUrl: prefs.gatewayUrl?.trim() ?? "",
    gatewayToken: prefs.gatewayToken?.trim() ?? "",
  };
}

export function resolveGatewayConfig(): Result<Preferences, GatewayError> {
  return mergeGatewayCredentials(fromRaycast(), loadDefaultGatewayCredentialsFile());
}
