import type { CallOptions } from "./mcp";

export type Credentials = { token: string; type: "oauth" | "personal" };

export type ToolCaller = {
  callTool<T>(name: string, args?: Record<string, unknown>, options?: CallOptions): Promise<T>;
};

export type SessionDependencies = {
  credentials(): Promise<Credentials>;
  renew(staleToken: string): Promise<string | undefined>;
  forget(staleToken: string): Promise<void>;
  connect(token: string): ToolCaller;
};

export const TOKEN_REJECTED =
  "SocialFaktory rejected the API token. Replace it in the extension preferences, or clear it to sign in with your browser.";

export const SIGN_IN_REJECTED =
  "SocialFaktory did not accept the sign-in. Use Sign in Again in a SocialFaktory command to connect again.";

export const CONNECTION_RENEWED =
  "The connection to SocialFaktory was renewed, so this write was not sent again. Check your credit balance in case the first attempt went through. Try Again starts a new write that reserves 3 credits.";

export const CONNECTION_RENEWED_TOOL =
  "The connection to SocialFaktory was renewed, so this write was not sent again. Check the credit balance in case the first attempt went through. Asking again starts a new write that reserves 3 credits.";

export class ConnectionRenewedError extends Error {
  constructor(message: string = CONNECTION_RENEWED) {
    super(message);
    this.name = "ConnectionRenewedError";
  }
}

type Open = { credentials: Credentials; caller: ToolCaller };

type Attempt<T> = { ok: true; value: T } | { ok: false };

function unauthorized(error: unknown): boolean {
  return error instanceof Error && error.name === "McpUnauthorizedError";
}

export function createSession(dependencies: SessionDependencies) {
  let current: Open | undefined;

  function open(credentials: Credentials): Open {
    current = { credentials, caller: dependencies.connect(credentials.token) };
    return current;
  }

  async function attempt<T>(
    session: Open,
    name: string,
    args: Record<string, unknown>,
    options?: CallOptions,
  ): Promise<Attempt<T>> {
    try {
      return { ok: true, value: await session.caller.callTool<T>(name, args, options) };
    } catch (error) {
      if (!unauthorized(error)) throw error;
      if (current === session) current = undefined;
      return { ok: false };
    }
  }

  async function call<T>(name: string, args: Record<string, unknown> = {}, options?: CallOptions): Promise<T> {
    const session = current ?? open(await dependencies.credentials());
    const first = await attempt<T>(session, name, args, options);
    if (first.ok) return first.value;
    if (session.credentials.type === "personal") throw new Error(TOKEN_REJECTED);

    const renewed = await dependencies.renew(session.credentials.token);
    if (renewed) {
      const retried = await attempt<T>(open({ token: renewed, type: "oauth" }), name, args, options);
      if (retried.ok) return retried.value;
    }

    await dependencies.forget(renewed ?? session.credentials.token);
    const fresh = open(await dependencies.credentials());
    if (options?.resendAfterSignIn === false) throw new ConnectionRenewedError();
    const signedIn = await attempt<T>(fresh, name, args, options);
    if (signedIn.ok) return signedIn.value;
    throw new Error(SIGN_IN_REJECTED);
  }

  function reset() {
    current = undefined;
  }

  return { call, reset };
}
