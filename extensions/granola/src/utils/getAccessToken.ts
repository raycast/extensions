import { OAuth, environment } from "@raycast/api";
import { mkdir, rmdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { exchangeToken, parseTokens } from "./granolaAuthProtocol";
import { diagnostic } from "./diagnostics";

// Use Raycast's secure token store and standard logout preference. Device
// authorization has no redirect, so PKCEClient.authorize is not used.
export const granolaOAuth = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Granola",
  providerIcon: "extension-icon.png",
  providerId: "granola-device",
});

export class SignInRequired extends Error {
  constructor() {
    super("Open Search Notes in Raycast to sign in to Granola.");
    this.name = "SignInRequired";
  }
}

let pending: Promise<string> | undefined;

async function token(forceRefresh = false, rejectedAccessToken?: string): Promise<string> {
  const saved = await granolaOAuth.getTokens();
  if (!saved?.accessToken) {
    diagnostic("auth.sign_in_required", { code: "missing_session" });
    throw new SignInRequired();
  }
  if (!forceRefresh && !saved.isExpired()) return saved.accessToken;
  // Another command may already have recovered the rejected session.
  if (rejectedAccessToken && saved.accessToken !== rejectedAccessToken && !saved.isExpired()) return saved.accessToken;
  if (!saved.refreshToken) throw new SignInRequired();
  // Commands/tools may run in separate processes. Serialize rotating refresh
  // tokens, and read the winning process's token before issuing another refresh.
  // Do not steal a lock after a crash: the request's outcome may be unknown.
  const lock = path.join(
    environment.supportPath,
    `granola-refresh-${createHash("sha256").update(saved.refreshToken).digest("hex")}.lock`,
  );
  await mkdir(environment.supportPath, { recursive: true });
  let acquired = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      await mkdir(lock);
      acquired = true;
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const updated = await granolaOAuth.getTokens();
      if (!updated?.accessToken) throw new SignInRequired();
      if (updated.refreshToken !== saved.refreshToken && !updated.isExpired()) return updated.accessToken;
      if (attempt === 0) diagnostic("auth.refresh_wait");
      await delay(250);
    }
  }
  if (!acquired) {
    diagnostic("auth.refresh_lock_timeout", { code: "reconnect_required" });
    throw new Error("Granola sign-in is busy. Sign out in extension preferences and reconnect.");
  }
  let releaseLock = true;
  try {
    const current = await granolaOAuth.getTokens();
    if (!current?.refreshToken) throw new SignInRequired();
    if (
      (!forceRefresh ||
        current.refreshToken !== saved.refreshToken ||
        (rejectedAccessToken && current.accessToken !== rejectedAccessToken)) &&
      !current.isExpired()
    )
      return current.accessToken;
    diagnostic("auth.refresh_started");
    // Once sent, a lost response or failed save can strand a rotated token.
    // Keep its lock in that case instead of replaying a possibly consumed token.
    releaseLock = false;
    const { response, body } = await exchangeToken({
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    });
    if (!response.ok) {
      releaseLock = true;
      if (body.error === "invalid_grant" || body.error === "access_denied") {
        const latest = await granolaOAuth.getTokens();
        if (latest?.refreshToken === current.refreshToken) await granolaOAuth.removeTokens();
        throw new SignInRequired();
      }
      throw new Error(`Could not refresh Granola sign-in (HTTP ${response.status}). Please try again.`);
    }
    const tokens = parseTokens(body);
    const latest = await granolaOAuth.getTokens();
    if (latest?.refreshToken !== current.refreshToken) throw new SignInRequired();
    await granolaOAuth.setTokens(tokens);
    releaseLock = true;
    diagnostic("auth.refresh_saved", { rotated: tokens.refreshToken !== current.refreshToken });
    return tokens.accessToken;
  } finally {
    if (releaseLock) await rmdir(lock);
    else diagnostic("auth.refresh_uncertain", { code: "reconnect_required" });
  }
}

export default function getAccessToken(forceRefresh = false): Promise<string> {
  pending ??= token(forceRefresh).finally(() => {
    pending = undefined;
  });
  return pending;
}

/** Recover a server-rejected token, even when its local expiry is in the future. */
export async function refreshRejectedAccessToken(rejectedAccessToken: string): Promise<string> {
  // A concurrent normal lookup can still resolve to the rejected token. Wait
  // for it, then explicitly recover under the same cross-process refresh lock.
  if (pending) await pending;
  pending ??= token(true, rejectedAccessToken).finally(() => {
    pending = undefined;
  });
  return pending;
}
