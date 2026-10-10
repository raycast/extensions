import { withAccessToken, WithAccessTokenComponentOrFn } from "@raycast/utils";
import { slack } from "./client/WebClient";

export function withSlackClient(Component: WithAccessTokenComponentOrFn) {
  return withAccessToken(slack)(Component);
}

/**
 * When Slack rejects a call with `missing_scope` and the user signed in with OAuth, drops the stored tokens so the
 * next attempt re-authorizes with the current scopes. Returns true if the caller should retry once.
 */
export async function shouldRetryAfterMissingScope(error: unknown, alreadyRetried: boolean): Promise<boolean> {
  if (alreadyRetried || !(error instanceof Error) || !error.message.includes("missing_scope")) return false;
  if (!(await slack.client.getTokens())) return false;
  await slack.client.removeTokens();
  return true;
}
