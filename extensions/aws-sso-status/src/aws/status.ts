import { CliError, runAws } from "./cli";
import { CredentialStatus, ProfileStatus, SsoProfile } from "./types";

export function getStatusFromExpiration(
  expiration: string | undefined,
  thresholdMinutes = 30,
  now = Date.now(),
): CredentialStatus {
  const deadline = expiration ? Date.parse(expiration) : NaN;
  if (!Number.isFinite(deadline)) return "Unknown";
  if (deadline <= now) return "Expired";
  return deadline - now <= thresholdMinutes * 60000 ? "Expiring Soon" : "Signed In";
}

/** Only expiration escapes this boundary. Never retain the parsed credential object. */
export function parseExpiration(output: string): string | undefined {
  try {
    const value: unknown = JSON.parse(output);
    if (!value || typeof value !== "object" || !("Expiration" in value)) return undefined;
    const expiration = value.Expiration;
    if (
      typeof expiration !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(expiration) ||
      !Number.isFinite(Date.parse(expiration))
    )
      return undefined;
    return new Date(expiration).toISOString();
  } catch {
    return undefined;
  }
}

export async function resolveStatus(
  profile: SsoProfile,
  executable: string,
  threshold = 30,
  timeoutMs = 8000,
): Promise<ProfileStatus> {
  const result: ProfileStatus = { profile, status: "Unknown", checkedAt: new Date().toISOString() };
  if (profile.issues.length) return { ...result, status: "Invalid Configuration", message: profile.issues.join(" ") };
  try {
    const expiration = parseExpiration(
      await runAws(executable, ["configure", "export-credentials", "--profile", profile.name, "--format", "process"], {
        timeoutMs,
      }),
    );
    return {
      ...result,
      checkedAt: new Date().toISOString(),
      expiration,
      status: getStatusFromExpiration(expiration, threshold),
      message: expiration ? undefined : "AWS CLI did not return a valid temporary credential expiration.",
    };
  } catch (error) {
    const safe = error instanceof CliError ? error : new CliError("failed");
    return {
      ...result,
      checkedAt: new Date().toISOString(),
      status:
        safe.kind === "login-required"
          ? "Not Signed In"
          : safe.kind === "missing"
            ? "AWS CLI Not Found"
            : safe.kind === "configuration"
              ? "Invalid Configuration"
              : "Unknown",
      failureKind: safe.kind,
      message: safe.message,
    };
  }
}
