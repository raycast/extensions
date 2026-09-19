import { execute, origin } from "./client";
import { connectionHandoffCode, handoffFromExecution, validatedIntegrationUrl } from "./connection-actions";
import { safeBrowserUrl } from "./execution";

/** Resolve the console's organization from the API principal, never browser state. */
export function scopedConsoleUrl(handoff: string, server: string, path: string): string {
  const valid = validatedIntegrationUrl(handoff, server, "executor");
  if (!valid || !safeBrowserUrl(valid)) throw new Error("Executor did not return a safe workspace link.");
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid console path.");
  const url = new URL(valid);
  const prefix = url.pathname.slice(0, url.pathname.lastIndexOf("/integrations/"));
  const target = new URL(`${prefix}${path}`, url.origin);
  if (target.origin !== url.origin || !target.pathname.startsWith(`${prefix}/`)) {
    throw new Error("Invalid workspace link.");
  }
  return target.href;
}

export async function consoleUrl(path: string): Promise<string> {
  const result = await execute(connectionHandoffCode({ integration: "executor" }));
  const handoff = handoffFromExecution(result);
  if (!handoff) throw new Error("Could not resolve this API key's workspace. Try again in Executor.");
  return scopedConsoleUrl(handoff.url, origin(), path);
}
