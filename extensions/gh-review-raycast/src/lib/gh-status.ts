/**
 * The readiness check that gates every command. The extension is useless
 * without an installed, authenticated `gh`, so rather than let each view fail
 * in its own way, all of them run this first and show the setup screen until
 * it reports "ready".
 *
 * The vocabulary and the pure decisions live in ./gh-readiness; this module is
 * the part that actually touches the CLI and the network.
 */
import { clearBinaryCache, findBinary } from "./binaries";
import { DEMO_VIEWER, isDemoMode } from "./demo";
import { GhError, forgetToken, ghRaw, token } from "./gh-cli";
import { missingScopesFrom, parseScopes, type GhStatus } from "./gh-readiness";
import { graphql } from "./graphql";
import { host } from "./preferences";

export { REQUIRED_SCOPES, isBlocked, type GhStatus } from "./gh-readiness";

/**
 * Runs the full check: binary present → token available → GitHub answers →
 * which scopes we ended up with.
 */
export async function checkGhStatus(): Promise<GhStatus> {
  // Screenshot mode bypasses the gate — there's no CLI involved at all.
  if (await isDemoMode()) {
    return { state: "ready", login: DEMO_VIEWER.login, scopes: ["repo", "read:org"], missingScopes: [] };
  }

  const currentHost = host();

  // 1. Is the binary there, and does it hold a token?
  try {
    await token(currentHost);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const installed = findBinary("gh") !== undefined;
    if (!installed || (error instanceof GhError && message.includes("was not found"))) {
      return { state: "not-installed", detail: message };
    }
    return { state: "not-authenticated", detail: message };
  }

  // 2. Does GitHub accept it?
  let login: string;
  try {
    const data = await graphql<{ viewer: { login: string } }>(`
      query {
        viewer {
          login
        }
      }
    `);
    login = data.viewer.login;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof GhError) {
      // A 401 surfaces as a GhError from the client — the token is bad, not
      // the network.
      return { state: "not-authenticated", detail: message };
    }
    return { state: "unreachable", detail: message };
  }

  // 3. Which scopes did we end up with?
  const status = await ghRaw(currentHost ? ["auth", "status", "--hostname", currentHost] : ["auth", "status"]);
  const scopes = parseScopes(`${status.stdout}\n${status.stderr}`);

  return { state: "ready", login, scopes, missingScopes: missingScopesFrom(scopes) };
}

/**
 * Maps a failure that happens *after* the gate opened — a token that expired
 * mid-session, a network drop — onto the same states the setup screen renders.
 */
export function statusFromError(error: Error): GhStatus {
  if (error instanceof GhError) {
    return error.message.includes("was not found")
      ? { state: "not-installed", detail: error.message }
      : { state: "not-authenticated", detail: error.message };
  }
  return { state: "unreachable", detail: error.message };
}

/**
 * Throws away everything cached about the CLI so a re-check sees the world as
 * it is now — the user has just installed gh, or run `gh auth login`, and
 * pressed "Check Again".
 */
export function resetGhCaches(): void {
  clearBinaryCache();
  forgetToken();
}
