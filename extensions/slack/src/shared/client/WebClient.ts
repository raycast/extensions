import { getPreferenceValues } from "@raycast/api";
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

const accessToken = getPreferenceValues<{ accessToken: string }>().accessToken;
export const slackWebClient: WebClient = new WebClient(accessToken);
