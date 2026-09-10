/**
 * The argocd CLI session, renewed silently.
 *
 * `argocd login <host> --sso` stores a bearer token and a refresh token in
 * ~/.config/argocd/config. Reading only the bearer, which is what this mode did at first, means
 * an OIDC id token lapses after roughly an hour and the operator is told to log in again. That
 * is a worse experience than the mode is capable of, and it made the mode look like a degraded
 * fallback rather than the tidy option it should be: one login, one credential store that the
 * CLI, this extension and any other ArgoCD tool all read.
 *
 * So the refresh token is used. What is deliberately **not** done is writing the renewed token
 * back into the CLI's config: that file belongs to the CLI, and an extension quietly rewriting
 * another tool's configuration is the kind of helpfulness nobody asks for. The renewal is kept
 * in this extension's own storage instead.
 *
 * The precedence rule below is what keeps that cache honest without any bookkeeping:
 *
 *   1. a config token that is still good wins, which is also how a fresh `argocd login` takes
 *      effect immediately and makes any stale cache irrelevant;
 *   2. otherwise a cached renewal that is still good wins, so a command open costs no round
 *      trip;
 *   3. otherwise the config's refresh token mints a new one.
 *
 * Nothing needs to record which refresh token produced which renewal: re-running
 * `argocd login` refreshes the config token, which rule 1 then prefers.
 */

import type { OidcSettings } from "../argocd/settings";
import type { ArgoInstance } from "../config/instances";
import { instanceHost } from "../config/instances";
import type { CliToken } from "./cliConfig";
import { OidcError, type OidcEndpoints, type TokenSet } from "./oidc";
import { AuthError } from "./provider";
import { mergeRenewal, needsRenewal, sessionFromTokens, type SsoSession } from "./session";

export interface CliSessionDeps {
  readCliToken: (host: string) => Promise<CliToken | undefined>;
  /** Where a renewal derived from the CLI's refresh token is kept. */
  readCachedSession: (instanceId: string) => Promise<SsoSession | undefined>;
  writeCachedSession: (instanceId: string, session: SsoSession) => Promise<void>;
  clearCachedSession: (instanceId: string) => Promise<void>;
  readSettings: (instance: ArgoInstance) => Promise<OidcSettings>;
  discover: (issuer: string) => Promise<OidcEndpoints>;
  refresh: (
    endpoints: OidcEndpoints,
    clientId: string,
    refreshToken: string,
    scopes: string[],
  ) => Promise<TokenSet>;
  now: () => number;
}

function loginRequired(instance: ArgoInstance, host: string, why: string): AuthError {
  return new AuthError(`${why} Run: argocd login ${host} --sso --grpc-web`, instance.id, host);
}

export function createCliTokenReader(deps: CliSessionDeps): (instance: ArgoInstance) => Promise<string> {
  return async (instance) => {
    const host = instanceHost(instance);
    const stored = await deps.readCliToken(host);

    if (!stored) {
      throw loginRequired(instance, host, `No argocd CLI session for ${host}.`);
    }

    // Rule 1. An account token has no readable expiry, so needsRenewal leaves it alone and this
    // is the branch that serves a non-expiring token written into the config by hand.
    const configSession = sessionFromTokens(
      { idToken: stored.token, refreshToken: stored.refreshToken, expiresAt: stored.expiresAt?.getTime() },
      "",
      "",
    );
    if (!needsRenewal(configSession, deps.now())) {
      return stored.token;
    }

    // Rule 2.
    const cached = await deps.readCachedSession(instance.id);
    if (cached && !needsRenewal(cached, deps.now())) {
      return cached.idToken;
    }

    // Rule 3.
    if (!stored.refreshToken) {
      throw loginRequired(
        instance,
        host,
        `The argocd CLI session for ${host} has expired and carries no refresh token.`,
      );
    }

    const settings = await deps.readSettings(instance);
    const endpoints = await deps.discover(settings.issuer);

    let tokens: TokenSet;
    try {
      tokens = await deps.refresh(endpoints, settings.clientId, stored.refreshToken, settings.scopes);
    } catch (error) {
      if (error instanceof OidcError && error.code === "invalid_grant") {
        // The refresh token in the config is spent, so only a new login fixes it, and the
        // cached renewal derived from it is worthless.
        await deps.clearCachedSession(instance.id);
        throw loginRequired(instance, host, `The argocd CLI session for ${host} was revoked or expired.`);
      }
      throw error;
    }

    const renewed = cached
      ? mergeRenewal(cached, tokens)
      : sessionFromTokens(tokens, settings.issuer, settings.clientId);
    await deps.writeCachedSession(instance.id, renewed);
    return renewed.idToken;
  };
}
