import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import { HttpsProxyAgent } from "https-proxy-agent";

export interface SlackConversation {
  id?: string;
  name?: string;
  user?: string;
  shared_team_ids?: string[];
  internal_team_ids?: string[];
  context_team_id?: string;
  is_private?: boolean;
}

export interface SlackMember {
  id?: string;
  team_id?: string;
  name?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    image_24?: string;
    title?: string;
    phone?: string;
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
  };
  tz?: string;
  deleted?: boolean;
  is_bot?: boolean;
  is_workflow_bot?: boolean;
}

const { accessToken, proxyUrl: proxyUrlPref } = getPreferenceValues<{ accessToken: string; proxyUrl?: string }>();
let slackWebClient: WebClient | null = null;

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const source = proxyUrlPref ? "preference" : process.env.HTTPS_PROXY ? "HTTPS_PROXY" : process.env.HTTP_PROXY ? "HTTP_PROXY" : null;
  const proxyUrl = proxyUrlPref || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (!proxyUrl || !source) {
    console.log(
      "[proxy] no proxy configured (preference=%s, HTTPS_PROXY=%s, HTTP_PROXY=%s)",
      proxyUrlPref ?? "unset",
      process.env.HTTPS_PROXY ?? "unset",
      process.env.HTTP_PROXY ?? "unset",
    );
    return undefined;
  }

  console.log("[proxy] using proxy from %s: %s", source, proxyUrl);
  return new HttpsProxyAgent(proxyUrl);
}

export const slack = OAuthService.slack({
  scope:
    "users:read channels:read groups:read im:read mpim:read chat:write channels:history groups:history im:history mpim:history channels:write groups:write im:write mpim:write users:write dnd:read dnd:write search:read users.profile:write emoji:read",
  personalAccessToken: accessToken,
  onAuthorize({ token }) {
    console.log("[slack] onAuthorize");
    const agent = getProxyAgent();
    slackWebClient = new WebClient(token, { rejectRateLimitedCalls: true, ...(agent && { agent }) });
  },
});

export function getSlackWebClient(): WebClient {
  if (!slackWebClient) {
    throw new Error("No slack client initialized");
  }

  return slackWebClient;
}
