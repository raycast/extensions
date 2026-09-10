/**
 * The silent half of single sign-on: hand out a valid bearer token, renewing it without
 * telling anyone.
 *
 * This is the module that answers the complaint that started it. Pasting a token every few days
 * is not an authentication method; a refresh token is. The operator logs in once in a browser,
 * and from then on every request that needs a token gets a fresh one from here, with no prompt,
 * no toast and no expiry to notice.
 *
 * All the outside world is injected, so the whole renewal policy is tested without a network,
 * a store or a clock.
 */

import type { ArgoInstance } from "../config/instances";
import type { OidcSettings } from "../argocd/settings";
import { AuthError } from "./provider";
import { OidcError, type OidcEndpoints, type TokenSet } from "./oidc";
import { matchesProvider, mergeRenewal, needsRenewal, type SsoSession } from "./session";

export interface SsoDeps {
  /** The stored session for this instance, or undefined when there has been no login. */
  readSession: (instanceId: string) => Promise<SsoSession | undefined>;
  writeSession: (instanceId: string, session: SsoSession) => Promise<void>;
  clearSession: (instanceId: string) => Promise<void>;
  /** The instance's own OIDC configuration, so nothing is hardcoded here. */
  readSettings: (instance: ArgoInstance) => Promise<OidcSettings>;
  discover: (issuer: string) => Promise<OidcEndpoints>;
  refresh: (endpoints: OidcEndpoints, clientId: string, refreshToken: string, scopes: string[]) => Promise<TokenSet>;
  now: () => number;
}

function loginRequired(instance: ArgoInstance, host: string, why: string): AuthError {
  return new AuthError(`${why} Log in to ${host} from Manage Instances.`, instance.id, host);
}

/**
 * Returns a bearer token for an instance in `sso` mode.
 *
 * The order is deliberate. A session that is still good is returned without a single request,
 * so the common path costs nothing. Only a session close to lapsing triggers a renewal, and
 * only a renewal that the provider refuses turns into something the operator has to see.
 */
export function createSsoTokenReader(deps: SsoDeps): (instance: ArgoInstance) => Promise<string> {
  return async (instance) => {
    const host = new URL(instance.baseUrl).host;
    const stored = await deps.readSession(instance.id);
    if (!stored) {
      return Promise.reject(loginRequired(instance, host, "There is no single sign-on session yet."));
    }

    if (!needsRenewal(stored, deps.now())) {
      return stored.idToken;
    }

    if (!stored.refreshToken) {
      // Nothing to renew from, which is the one case where an expiry has to be someone's
      // problem. It happens when the provider was not asked for offline_access.
      throw loginRequired(instance, host, "The single sign-on session has expired and carries no refresh token.");
    }

    const settings = await deps.readSettings(instance);
    if (!matchesProvider(stored, settings.issuer, settings.clientId)) {
      // The instance now points at a different provider or client, so the session is void
      // whatever its expiry says. Keeping it would produce a confusing 401 instead.
      await deps.clearSession(instance.id);
      throw loginRequired(
        instance,
        host,
        "This instance now uses a different identity provider, so the stored session no longer applies.",
      );
    }

    const endpoints = await deps.discover(settings.issuer);

    let tokens: TokenSet;
    try {
      tokens = await deps.refresh(endpoints, settings.clientId, stored.refreshToken, settings.scopes);
    } catch (error) {
      // A refused refresh token is spent: keeping it would retry the same failure on every
      // request. Anything else, a provider outage for instance, leaves it alone to be retried.
      if (error instanceof OidcError && error.code === "invalid_grant") {
        await deps.clearSession(instance.id);
        throw loginRequired(instance, host, "The single sign-on session was revoked or has expired.");
      }
      throw error;
    }

    const renewed = mergeRenewal(stored, tokens);
    await deps.writeSession(instance.id, renewed);
    return renewed.idToken;
  };
}
