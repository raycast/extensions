import type { CredentialCheck } from "../agents/credential-check.ts";
import { readAntigravityOAuthCredentials } from "./auth.ts";
import { AntigravityProbeError, detectProcessInfo } from "./probe.ts";

/**
 * The active language server may use a different account from the CLI OAuth
 * store. Its process/CSRF identity cannot prove which account is logged in.
 */
export async function checkAntigravityCredentials(
  detect = detectProcessInfo,
  readCredentials = readAntigravityOAuthCredentials,
): Promise<CredentialCheck> {
  try {
    await detect();
    return { status: "unverified" };
  } catch (error) {
    if (!(error instanceof AntigravityProbeError) || error.code !== "not_running") {
      return { status: "unverified" };
    }
  }
  try {
    const credentials = await readCredentials();
    if (!credentials) return { status: "unverified" };
    return {
      status: "authenticated",
      key: JSON.stringify(["oauth", credentials.token.refresh_token ?? credentials.token.access_token]),
    };
  } catch {
    return { status: "unverified" };
  }
}
