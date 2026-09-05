import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import { HttpsProxyAgent } from "https-proxy-agent";
import { formatRetryAfter, observeSlackRateLimits, slackRateLimitDocumentationUrl } from "./rateLimit";

export interface SlackConversation {
  id?: string;
  name?: string;
  user?: string;
  shared_team_ids?: string[];
  internal_team_ids?: string[];
  context_team_id?: string;
  is_private?: boolean;
  is_mpim?: boolean;
}

export interface SlackMember {
  id?: string;
  team_id?: string;
  name?: string;
  real_name?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
    email?: string;
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
let rateLimitToast: Toast | undefined;
let rateLimitToastTimeout: ReturnType<typeof setTimeout> | undefined;

async function showRateLimitToast(retryAfter: number) {
  const message = `Slack requested a ${formatRetryAfter(retryAfter)} wait. Retrying automatically.`;

  if (rateLimitToast) {
    rateLimitToast.style = Toast.Style.Animated;
    rateLimitToast.title = "Slack rate limit exceeded";
    rateLimitToast.message = message;
  } else {
    rateLimitToast = await showToast({
      style: Toast.Style.Animated,
      title: "Slack rate limit exceeded",
      message,
      primaryAction: {
        title: "View Slack Rate Limits",
        onAction: () => open(slackRateLimitDocumentationUrl),
      },
    });
  }

  if (rateLimitToastTimeout) clearTimeout(rateLimitToastTimeout);
  const toast = rateLimitToast;
  rateLimitToastTimeout = setTimeout(
    () => {
      if (rateLimitToast === toast) {
        void toast.hide();
        rateLimitToast = undefined;
      }
    },
    Math.max(1, retryAfter) * 1000,
  );
}

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
    "users:read users:read.email channels:read groups:read im:read mpim:read chat:write channels:history groups:history im:history mpim:history channels:write groups:write im:write mpim:write users:write dnd:read dnd:write search:read users.profile:write emoji:read users.profile:read files:write reactions:write",
  personalAccessToken: accessToken,
  onAuthorize({ token }) {
    const agent = getProxyAgent();
    slackWebClient = observeSlackRateLimits(new WebClient(token, { ...(agent && { agent }) }), (retryAfter) => {
      void showRateLimitToast(retryAfter);
    });
  },
});

export function getSlackWebClient(): WebClient {
  if (!slackWebClient) {
    throw new Error("No slack client initialized");
  }

  return slackWebClient;
}
