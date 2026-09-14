import type { OAuth } from "@raycast/api";

import type { ViewerIdentity } from "./oauth";

export type WorkspaceAddResult = { identity: ViewerIdentity; isNew: boolean } | null;

type Dependencies = {
  staging: Pick<OAuth.PKCEClient, "getTokens" | "removeTokens">;
  hasPendingAdd(): Promise<boolean>;
  markPendingAdd(): Promise<void>;
  clearPendingAdd(): Promise<void>;
  authorize(): Promise<string>;
  identify(accessToken: string): Promise<ViewerIdentity>;
  verify(accessToken: string): Promise<unknown>;
  getDestination(identity: ViewerIdentity): Promise<Pick<OAuth.PKCEClient, "setTokens">>;
  register(identity: ViewerIdentity): Promise<{ isNew: boolean }>;
  trace<T>(stage: string, operation: () => Promise<T>): Promise<T>;
};

function isPermanentTokenFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /HTTP (401|403)/.test(message);
}

export function createWorkspaceAddFlow(dependencies: Dependencies) {
  const { staging, trace } = dependencies;
  let adding: Promise<WorkspaceAddResult> | undefined;
  let recovering: Promise<WorkspaceAddResult> | undefined;

  async function complete(): Promise<WorkspaceAddResult> {
    const tokens = await trace("staging.read", () => staging.getTokens());
    if (!tokens?.accessToken) {
      // The browser grant may still be in progress. Absence of a token does not
      // prove cancellation, so keep the marker until completion or explicit retry.
      return null;
    }

    let identity: ViewerIdentity;
    try {
      identity = await trace("identity.fetch", () => dependencies.identify(tokens.accessToken));
      await trace("identity.verify", () => dependencies.verify(tokens.accessToken));
    } catch (error) {
      if (isPermanentTokenFailure(error)) {
        await trace("staging.reject", () => staging.removeTokens());
        await dependencies.clearPendingAdd();
      }
      throw error;
    }

    const destination = await dependencies.getDestination(identity);
    // setTokens restamps updatedAt. Preserve the remaining lifetime during recovery,
    // and leave tokens without an expiry non-expiring.
    const elapsedSeconds = Math.floor((Date.now() - tokens.updatedAt.getTime()) / 1000);
    await trace("destination.save", () =>
      destination.setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
        scope: tokens.scope,
        ...(tokens.expiresIn !== undefined ? { expiresIn: Math.max(60, tokens.expiresIn - elapsedSeconds) } : {}),
      }),
    );
    // Publish only after the credentials are saved. Any save failure leaves the
    // staging token and marker available for another recovery attempt.
    const { isNew } = await trace("registry.save", () => dependencies.register(identity));
    await trace("staging.cleanup", () => staging.removeTokens());
    await trace("intent.cleanup", dependencies.clearPendingAdd);
    return { identity, isNew };
  }

  function add(): Promise<WorkspaceAddResult> {
    if (adding) return adding;
    adding = trace("add", async () => {
      // Finish mount-time recovery before starting a new grant. An explicit Add
      // action can retry authentication if that recovery failed.
      if (recovering) await recovering.catch(() => undefined);
      await trace("staging.reset", () => staging.removeTokens());
      await trace("intent.save", dependencies.markPendingAdd);
      await trace("oauth.authorize", dependencies.authorize);
      return complete();
    }).finally(() => {
      adding = undefined;
    });
    return adding;
  }

  function recover(): Promise<WorkspaceAddResult> {
    // A remounted view joins the existing operation instead of consuming its
    // staging token or clearing its marker while the browser is still open.
    if (adding) return adding;
    if (recovering) return recovering;
    recovering = trace("recovery", async () => {
      if (!(await dependencies.hasPendingAdd())) return null;
      return complete();
    }).finally(() => {
      recovering = undefined;
    });
    return recovering;
  }

  return { add, recover };
}
