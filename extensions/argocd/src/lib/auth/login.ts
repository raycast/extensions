/**
 * Re-runs the argocd CLI's SSO login when the stored session has expired.
 *
 * `argocd login <host> --sso` opens the browser, serves the loopback callback itself, and
 * rewrites ~/.config/argocd/config when it succeeds. There is nothing useful to read on its
 * stdout, so the process is spawned detached and the config file is polled instead: that also
 * means a login the operator completes in another window is picked up just the same.
 */

import type { CliToken } from "./cliConfig";
import { isExpired } from "./cliConfig";

export interface SsoLoginDeps {
  spawn: (file: string, args: string[]) => void;
  readToken: (host: string) => Promise<CliToken | undefined>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

export const DEFAULT_LOGIN_TIMEOUT_MS = 120_000;
export const DEFAULT_LOGIN_POLL_MS = 750;

export function ssoLoginArgs(host: string): string[] {
  // --grpc-web is what makes the CLI work through an ingress that does not proxy raw gRPC,
  // which is the usual shape of an ArgoCD published over HTTPS.
  return ["login", host, "--sso", "--grpc-web"];
}

export async function runSsoLogin(
  host: string,
  cliPath: string,
  deps: SsoLoginDeps,
  timeoutMs: number = DEFAULT_LOGIN_TIMEOUT_MS,
  pollMs: number = DEFAULT_LOGIN_POLL_MS,
): Promise<CliToken> {
  const deadline = deps.now() + timeoutMs;
  deps.spawn(cliPath, ssoLoginArgs(host));

  for (;;) {
    await deps.sleep(pollMs);

    const token = await deps.readToken(host);
    if (token && !isExpired(token, new Date(deps.now()))) {
      return token;
    }

    if (deps.now() >= deadline) {
      throw new Error(
        `Timed out waiting for the SSO login to ${host}. Finish the login in the browser, then try again.`,
      );
    }
  }
}
