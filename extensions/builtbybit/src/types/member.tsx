export interface Member {
  member_id: number;
  username: string;
  join_date: number;
  last_activity_date?: number;
  banned: boolean;
  suspended: boolean;
  restricted: boolean;
  disabled: boolean;
  premium: boolean;
  supreme: boolean;
  ultimate: boolean;
  discord_id?: number;
  avatar_url: string;
  post_count: number;
  resource_count: number;
  purchase_count: number;
  feedback_positive: number;
  feedback_neutral: number;
  feedback_negative: number;
}
