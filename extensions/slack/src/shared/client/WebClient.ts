import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { WebClient } from "@slack/web-api";

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
  };

  deleted?: boolean;
  is_bot?: boolean;
  is_workflow_bot?: boolean;
}

const { accessToken } = getPreferenceValues<{ accessToken: string }>();
let slackWebClient: WebClient | null = null;

export const slack = OAuthService.slack({
  scope:
    "users:read channels:read groups:read im:read mpim:read channels:history groups:history im:history mpim:history channels:write groups:write im:write mpim:write users:write dnd:read dnd:write",
  personalAccessToken: accessToken,
  onAuthorize({ token }) {
    slackWebClient = new WebClient(token);
  },
});

export function getSlackWebClient(): WebClient {
  if (!slackWebClient) {
    throw new Error("No slack client initialized");
  }

  return slackWebClient;
}
