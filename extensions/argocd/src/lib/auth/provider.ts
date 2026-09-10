/**
 * Resolves the bearer token for an instance, from whichever store its auth mode names.
 *
 * The `sso` mode is the one that matters: it renews the token from the refresh token before
 * every request that needs it, so the operator logs in once in a browser and is never asked
 * again. Renewal happens ahead of expiry rather than on a 401, because a 401 is something the
 * operator sees and a renewal thirty seconds early is something they never do.
 *
 * Every failure is an AuthError carrying the instance and the host, because the only useful
 * recovery is "log in to that host", and the UI needs both to offer it. No message ever
 * carries the token itself.
 */

import type { ArgoInstance } from "../config/instances";
import { instanceHost } from "../config/instances";
import { isExpired, type CliToken } from "./cliConfig";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly instanceId: string,
    readonly host: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface TokenProviderDeps {
  readCliToken: (host: string) => Promise<CliToken | undefined>;
  readStoredToken: (instanceId: string) => Promise<string | undefined>;
  /** Reads the stored SSO session, renewing it silently when it is close to lapsing. */
  readSsoToken?: (instance: ArgoInstance) => Promise<string>;
  /**
   * Reads the argocd CLI session, renewing it from the refresh token that `argocd login --sso`
   * stored. Supplied in the Raycast context; without it the mode falls back to the bearer
   * alone, which lapses with the identity provider's id token.
   */
  readCliSessionToken?: (instance: ArgoInstance) => Promise<string>;
  now: () => Date;
}

export type TokenProvider = (instance: ArgoInstance) => Promise<string>;

export function createTokenProvider(deps: TokenProviderDeps): TokenProvider {
  return async (instance) => {
    const host = instanceHost(instance);

    if (instance.authMode === "sso") {
      if (!deps.readSsoToken) {
        throw new AuthError(
          `Single sign-on is not wired up in this context for ${instance.name}.`,
          instance.id,
          host,
        );
      }
      return deps.readSsoToken(instance);
    }

    if (instance.authMode === "token") {
      const token = await deps.readStoredToken(instance.id);
      if (!token) {
        throw new AuthError(
          `No API token stored for ${instance.name}. Add one from Manage Instances.`,
          instance.id,
          host,
        );
      }
      return token;
    }

    if (deps.readCliSessionToken) {
      return deps.readCliSessionToken(instance);
    }

    const session = await deps.readCliToken(host);
    if (!session) {
      throw new AuthError(
        `No argocd CLI session for ${host}. Run the SSO login to create one.`,
        instance.id,
        host,
      );
    }
    if (isExpired(session, deps.now())) {
      throw new AuthError(`The argocd CLI session for ${host} has expired. Log in again.`, instance.id, host);
    }
    return session.token;
  };
}
