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

const { accessToken, proxyUrl: proxyUrlPref } = getPreferenceValues<Preferences>();
let slackWebClient: WebClient | null = null;

function getHttpProxy() {
  if (process.env.HTTPS_PROXY) return "HTTPS_PROXY";
  if (process.env.HTTP_PROXY) return "HTTP_PROXY";
  return null;
}

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const source = proxyUrlPref ? "preference" : getHttpProxy();
  const proxyUrl = proxyUrlPref || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (!proxyUrl || !source) {
    return undefined;
  }
  return new HttpsProxyAgent(proxyUrl);
}

export const slack = OAuthService.slack({
  scope:
    "users:read channels:read groups:read im:read mpim:read chat:write channels:history groups:history im:history mpim:history channels:write groups:write im:write mpim:write users:write dnd:read dnd:write search:read users.profile:write emoji:read users.profile:read",
  personalAccessToken: accessToken,
  onAuthorize({ token }) {
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
