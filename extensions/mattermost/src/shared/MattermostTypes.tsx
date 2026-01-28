import { DateTime, Duration } from "luxon";

export declare type UserProfile = {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  username: string;
  password: string;
  auth_data: string;
  auth_service: string;
  email: string;
  email_verified: boolean;
  nickname: string;
  first_name: string;
  last_name: string;
  position: string;
  roles: string;
  allow_marketing: boolean;
  props: Dictionary<string>;
  last_password_update: number;
  last_picture_update: number;
  failed_attempts: number;
  locale: string;
  mfa_active: boolean;
  mfa_secret: string;
  last_activity_at: number;
  is_bot: boolean;
  bot_description: string;
  bot_last_icon_update: number;
  terms_of_service_id: string;
  terms_of_service_create_at: number;
};

export declare type UserProfileStatus = {
  user_id: string;
  status: UserProfileStatusKind;
  manual: boolean;
  last_activity_at: number;
};

export declare type UserProfileStatusKind = "offline" | "online" | "away" | "dnd";

export declare type UnreadMessageCount = {
  team_id: string;
  channel_id: string;
  msg_count: number;
  mention_count: number;
};

export declare type Dictionary<T> = {
  [key: string]: T;
};

export declare type TeamsWithCount = {
  teams: Team[];
  total_count: number;
};

export declare type TeamType = "O" | "I";

export declare type Team = {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  display_name: string;
  name: string;
  description: string;
  email: string;
  type: TeamType;
  company_name: string;
  allowed_domains: string;
  invite_id: string;
  allow_open_invite: boolean;
  scheme_id: string;
  group_constrained: boolean;
};

export declare type Channel = {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  team_id: string;
  type: ChannelType;
  display_name: string;
  name: string;
  header: string;
  purpose: string;
  last_post_at: number;
  total_msg_count: number;
  extra_update_at: number;
  creator_id: string;
  scheme_id: string;
  isCurrent?: boolean;
  teammate_id?: string;
  status?: string;
  fake?: boolean;
  group_constrained: boolean;
};

export declare type ChannelType = "O" | "P" | "D" | "G";

export declare type OrderedChannelCategories = {
  categories: ChannelCategory[];
  order: string[];
};

export declare type ChannelCategory = {
  id: string;
  user_id: $ID<UserProfile>;
  team_id: $ID<Team>;
  type: ChannelCategoryType;
  display_name: string;
  channel_ids: $ID<Channel>[];
  muted: boolean;
};

export declare type $ID<
  E extends {
    id: string;
  },
> = E["id"];

export declare type ChannelCategoryType = "favorites" | "channels" | "direct_messages" | "custom";

export declare type CustomStatusDuration =
  | "thirty_minutes"
  | "one_hour"
  | "four_hours"
  | "today"
  | "this_week"
  | "date_and_time";

export declare type CustomProfileStatus = {
  text: string;
  emojiCode: string;
  duration?: CustomStatusDuration;
  expires_at?: string;
};

export function durationToExpireDate(duration: CustomStatusDuration): string {
  switch (duration) {
    case "thirty_minutes":
      return DateTime.local()
        .plus(Duration.fromObject({ minutes: 30 }))
        .toISO()!;
    case "one_hour":
      return DateTime.local()
        .plus(Duration.fromObject({ hours: 1 }))
        .toISO()!;
    case "four_hours":
      return DateTime.local()
        .plus(Duration.fromObject({ hours: 4 }))
        .toISO()!;
    case "today":
      return DateTime.local().endOf("day").toISO()!;
    case "this_week":
      return DateTime.local().endOf("week").toISO()!;
    default:
      return "0001-01-01T00:00:00Z";
  }
}

export function durationToString(duration: CustomStatusDuration, expires_at?: string): string | undefined {
  switch (duration) {
    case "thirty_minutes":
      return "30 Minutes";
    case "one_hour":
      return "1 Hour";
    case "four_hours":
      return "4 Hours";
    case "today":
      return "Today";
    case "this_week":
      return "This Week";
    case "date_and_time":
      if (expires_at == undefined) {
        return undefined;
      }

      return DateTime.fromISO(expires_at).toRelative({ base: DateTime.local() })!.toString();
    default:
      return undefined;
  }
}
