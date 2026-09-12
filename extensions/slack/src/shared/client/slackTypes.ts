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
