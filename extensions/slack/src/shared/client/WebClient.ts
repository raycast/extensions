import { getPreferenceValues } from "@raycast/api";
import { WebClient } from "@slack/web-api";

export interface SlackConversation {
  id?: string;
  name?: string;
  shared_team_ids?: string[];
  internal_team_ids?: string[];
  context_team_id?: string;
  is_private?: boolean;
}

const accessToken = getPreferenceValues<{ accessToken: string }>().accessToken;
export const slackWebClient: WebClient = new WebClient(accessToken);
