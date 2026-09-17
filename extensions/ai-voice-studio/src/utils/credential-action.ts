import { openExtensionPreferences } from "@raycast/api";
import { openProviderSetupCommand } from "./provider-setup-command";

// A credential error means the request was rejected for authentication
// reasons: -1 = key/config missing (thrown by every provider client before
// the request), 401/403 = the server rejected the supplied key. Other codes
// (model unavailable, timeout, empty audio, HTTP 5xx/429) are not credential
// problems and should route to Setup Voice Defaults, not the key Preferences.
//
// Gating on the numeric code instead of regex-matching the error message is
// deterministic and survives localized / non-"key" auth messages.
const CREDENTIAL_ERROR_CODES = new Set([-1, 401, 403]);

export function isCredentialErrorCode(code: number | undefined): boolean {
  return code !== undefined && CREDENTIAL_ERROR_CODES.has(code);
}

export function getConfigurationAction(code: number | undefined) {
  return isCredentialErrorCode(code)
    ? { title: "Open API Key Preferences", onAction: openExtensionPreferences }
    : { title: "Setup Voice Defaults", onAction: openProviderSetupCommand };
}
