import { environment, OAuth } from "@raycast/api";

const build = "workspace-add-recovery-fix";
let sequence = 0;

// Development logs contain stages and timings only, never credentials or account details.
export async function traceWorkspaceAdd<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  if (!environment.isDevelopment) return operation();
  const step = ++sequence;
  const startedAt = Date.now();
  const log = (event: "start" | "success" | "failure") => {
    console.log(
      "[linear-workspace-add]",
      JSON.stringify({ build, processId: process.pid, step, stage, event, elapsedMs: Date.now() - startedAt }),
    );
  };
  log("start");
  try {
    const result = await operation();
    log("success");
    return result;
  } catch (error) {
    log("failure");
    throw error;
  }
}

// OAuthService.authorize combines the native redirect, token exchange, and staging save.
// Trace the native boundaries too, so a pending browser callback can be distinguished
// from a failed token exchange without logging the request URL or response body.
export function traceStagingClient(client: OAuth.PKCEClient): void {
  if (!environment.isDevelopment) return;
  const authorize = client.authorize.bind(client);
  client.authorize = (options) => traceWorkspaceAdd("oauth.browser-callback", () => authorize(options));
  const setTokens = client.setTokens.bind(client);
  client.setTokens = (options) => traceWorkspaceAdd("oauth.staging-save", () => setTokens(options));
}
