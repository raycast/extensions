import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import { HttpsProxyAgent } from "https-proxy-agent";

export type { SlackConversation, SlackMember } from "./slackTypes";

const { accessToken, proxyUrl: proxyUrlPref } = getPreferenceValues<Preferences>();
let slackWebClient: WebClient | null = null;
let currentToken: string | undefined = accessToken;

function getHttpProxy() {
  if (process.env.HTTPS_PROXY) return "HTTPS_PROXY";
  if (process.env.HTTP_PROXY) return "HTTP_PROXY";
  return null;
}

export function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const source = proxyUrlPref ? "preference" : getHttpProxy();
  const proxyUrl = proxyUrlPref || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (!proxyUrl || !source) {
    return undefined;
  }
  return new HttpsProxyAgent(proxyUrl);
}

export const slack = OAuthService.slack({
  scope:
    "users:read users:read.email channels:read groups:read im:read mpim:read chat:write channels:history groups:history im:history mpim:history channels:write groups:write im:write mpim:write users:write dnd:read dnd:write search:read users.profile:write emoji:read users.profile:read files:read files:write reactions:write",
  personalAccessToken: accessToken,
  onAuthorize({ token }) {
    currentToken = token;
    const agent = getProxyAgent();
    // Let the SDK honor Retry-After silently, including during AI tool calls.
    slackWebClient = new WebClient(token, { ...(agent && { agent }) });
  },
});

export function getSlackWebClient(): WebClient {
  if (!slackWebClient) {
    throw new Error("No slack client initialized");
  }

  return slackWebClient;
}

/**
 * Returns the bearer token backing the active Slack client. This is the OAuth
 * access token (set during `onAuthorize`) or the personal access token from
 * preferences. Used to authenticate direct file downloads that go outside the
 * `@slack/web-api` client.
 */
export function getSlackToken(): string | undefined {
  return currentToken;
}
