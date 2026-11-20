import { withAccessToken, WithAccessTokenComponentOrFn } from "@raycast/utils";
import { slack } from "./client/WebClient";
import { getPreferenceValues } from "@raycast/api";
import { canReauthorizeSlack, getMissingScopeDetails } from "./client/permissions";

export function withSlackClient(Component: WithAccessTokenComponentOrFn) {
  return withAccessToken(slack)(Component);
}

/**
 * When Slack rejects a call with `missing_scope` and the user signed in with OAuth, drops the stored tokens so the
 * next attempt re-authorizes with the current scopes. Returns true if the caller should retry once.
 */
export async function shouldRetryAfterMissingScope(error: unknown, alreadyRetried: boolean): Promise<boolean> {
  if (alreadyRetried || !getMissingScopeDetails(error)) return false;
  const { accessToken } = getPreferenceValues<Preferences>();
  if (!canReauthorizeSlack(accessToken, !!(await slack.client.getTokens()))) return false;
  await slack.client.removeTokens();
  return true;
}
