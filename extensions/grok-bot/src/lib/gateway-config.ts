import { CredentialsFileError } from "./credentials-file";
import { GatewayCredentials, GatewayError, Result, err, ok } from "./types";

function isGatewayConfigured(prefs: GatewayCredentials): boolean {
  return prefs.gatewayUrl.length > 0 && prefs.gatewayToken.length > 0;
}

function credentialsFileMessage(error: CredentialsFileError): string {
  switch (error.kind) {
    case "missing":
      return "gateway.env is missing";
    case "not-a-regular-file":
      return "gateway.env must be a regular file, not a symlink";
    case "insecure-permissions":
      return "gateway.env must not be group or world readable";
    case "invalid-format":
      return error.detail;
    case "unreadable":
      return "could not read gateway.env";
    default: {
      const _exhaustive: never = error;
      return _exhaustive;
    }
  }
}

export function mergeGatewayCredentials(
  raycast: GatewayCredentials,
  file: Result<GatewayCredentials, CredentialsFileError>,
): Result<GatewayCredentials, GatewayError> {
  if (isGatewayConfigured(raycast)) {
    return ok({
      gatewayUrl: raycast.gatewayUrl.trim(),
      gatewayToken: raycast.gatewayToken.trim(),
    });
  }

  if (file.ok) {
    return ok({
      gatewayUrl: file.value.gatewayUrl.trim(),
      gatewayToken: file.value.gatewayToken.trim(),
    });
  }

  if (file.error.kind === "missing") {
    return err({ kind: "not-configured" });
  }

  return err({ kind: "credentials-file", detail: credentialsFileMessage(file.error) });
}

export function normalizeGatewayUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
