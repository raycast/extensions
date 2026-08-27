import { getPreferenceValues } from "@raycast/api";
import { loadDefaultGatewayCredentialsFile } from "./credentials-file";
import { mergeGatewayCredentials } from "./gateway-config";
import { GatewayCredentials, Result, GatewayError } from "./types";

function fromRaycast(): GatewayCredentials {
  const prefs = getPreferenceValues<Preferences>();
  return {
    gatewayUrl: prefs.gatewayUrl?.trim() ?? "",
    gatewayToken: prefs.gatewayToken?.trim() ?? "",
  };
}

export function resolveGatewayConfig(): Result<GatewayCredentials, GatewayError> {
  return mergeGatewayCredentials(fromRaycast(), loadDefaultGatewayCredentialsFile());
}
