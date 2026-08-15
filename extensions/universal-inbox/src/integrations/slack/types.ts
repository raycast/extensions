import { match, P } from "ts-pattern";

export interface SlackStar {
  state: SlackStarState;
  created_at: Date;
  item: SlackStarItem;
}

export function getSlackStarHtmlUrl(slack_star: SlackStar): string {
  return match(slack_star.item)
    .with({ type: "Message", content: P.select() }, (message) => message.url)
    .with(
      { type: "File", content: P.select() },
      (file) => `https://app.slack.com/client/${file.team.id}/${file.channel.id}`,
    )
    .with(
      { type: "FileComment", content: P.select() },
      (fileComment) => `https://app.slack.com/client/${fileComment.team.id}/${fileComment.channel.id}`,
    )
    .with(
      { type: "Channel", content: P.select() },
      (channel) => `https://app.slack.com/client/${channel.team.id}/${channel.channel.id}`,
    )
    .with({ type: "Im", content: P.select() }, (im) => `https://app.slack.com/client/${im.team.id}/${im.channel.id}`)
    .with(
      { type: "Group", content: P.select() },
      (group) => `https://app.slack.com/client/${group.team.id}/${group.channel.id}`,
    )
    .otherwise(() => "");
}

export enum SlackStarState {
  StarAdded = "StarAdded",
  StarRemoved = "StarRemoved",
}

export type SlackStarItem =
  | { type: "Message"; content: SlackMessageDetails }
  | { type: "File"; content: SlackFileDetails }
  | { type: "FileComment"; content: SlackFileCommentDetails }
  | { type: "Channel"; content: SlackChannelDetails }
  | { type: "Im"; content: SlackImDetails }
  | { type: "Group"; content: SlackGroupDetails };

export interface SlackReaction {
  name: string;
  state: SlackReactionState;
  created_at: Date;
  item: SlackReactionItem;
}

export function getSlackReactionHtmlUrl(slack_reaction: SlackReaction): string {
  return match(slack_reaction.item)
    .with({ type: "Message", content: P.select() }, (message) => message.url)
    .with(
      { type: "File", content: P.select() },
      (file) => `https://app.slack.com/client/${file.team.id}/${file.channel.id}`,
    )
    .otherwise(() => "");
}

export enum SlackReactionState {
  ReactionAdded = "ReactionAdded",
  ReactionRemoved = "ReactionRemoved",
}

export type SlackReactionItem =
  | { type: "Message"; content: SlackMessageDetails }
  | { type: "File"; content: SlackFileDetails };

export interface SlackThread {
  url: string;
  messages: Array<SlackHistoryMessage>;
  sender_profiles: Record<string, SlackMessageSenderDetails>;
  subscribed: boolean;
  last_read?: string;
  channel: SlackChannelInfo;
  team: SlackTeamInfo;
  references?: SlackReferences;
}

export function getSlackThreadHtmlUrl(slack_thread: SlackThread): string {
  return slack_thread.url;
}

export interface SlackReferences {
  channels: Record<string, string | null>;
  users: Record<string, string | null>;
  usergroups: Record<string, string | null>;
}

export interface SlackPushEventCallback {
  team_id: string;
  api_app_id: string;
  event: SlackEventCallbackBody;
  event_id: string;
  event_time: Date;
  event_context?: string;
  authed_users?: Array<string>;
  authorizations?: Array<SlackEventAuthorization>;
}

export interface SlackEventAuthorization {
  team_id: string;
  user_id: string;
  is_bot: boolean;
}

export type SlackEventCallbackBody =
  | { type: "SarAdded"; content: SlackStarAddedEvent }
  | { type: "StarRemoved"; content: SlackStarRemovedEvent };

export interface SlackStarAddedEvent {
  user: string;
  item: SlackStarsItem;
  event_ts: Date;
}

export interface SlackStarRemovedEvent {
  user: string;
  item: SlackStarsItem;
  event_ts: Date;
}

export type SlackStarsItem =
  | { type: "Message"; content: SlackStarsItemMessage }
  | { type: "File"; content: SlackStarsItemFile }
  | { type: "FileComment"; content: SlackStarsItemFileComment }
  | { type: "Channel"; content: SlackStarsItemChannel }
  | { type: "Im"; content: SlackStarsItemIm }
  | { type: "Group"; content: SlackStarsItemGroup };

export interface SlackStarsItemMessage {
  message: SlackHistoryMessage;
  channel: string;
  date_create: Date;
}

export interface SlackHistoryMessage {
  ts: string;
  channel?: string;
  channel_type?: string;
  thread_ts?: string;
  client_msg_id?: string;
  user?: string;
  bot_id?: string;

  text?: string;
  blocks?: Array<SlackBlock>;
  attachments?: Array<SlackMessageAttachment>;
  upload?: boolean;
  files?: Array<SlackFile>;
  reactions?: Array<SlackReactionDetails>;
}

export interface SlackReactionDetails {
  name: string;
  count: number;
  users: Array<string>;
}

export interface SlackMessageAttachment {
  id?: number;
  color?: string;
  fallback?: string;
  title?: string;
  fields?: Array<SlackMessageAttachmentFieldObject>;
  mrkdwn_in?: Array<string>;
  text?: string;
}

export interface SlackMessageAttachmentFieldObject {
  title?: string;
  value?: string;
  short?: boolean;
}

export type SlackBlock =
  | SlackSectionBlock
  | SlackHeaderBlock
  | SlackDividerBlock
  | SlackImageBlock
  | SlackActionsBlock
  | SlackContextBlock
  | SlackInputBlock
  | SlackFileBlock
  | { type: "rich_text" }
  | { type: "event" };

export interface SlackSectionBlock {
  type: "section";
  block_id?: string;
  text?: SlackBlockText;
  fields?: Array<SlackBlockText>;
  // To be specified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessory?: any;
}

export type SlackBlockText =
  | { type: "plain_text"; value: string }
  | { type: "mrkdwn"; text: string; verbatim?: boolean };

export interface SlackHeaderBlock {
  type: "header";
  block_id?: string;
  text: SlackBlockText;
}

export interface SlackDividerBlock {
  type: "divider";
  block_id?: string;
}

export interface SlackImageBlock {
  type: "image";
  block_id?: string;
  image_url: string;
  alt_text: string;
  title?: SlackBlockText;
}

export interface SlackActionsBlock {
  type: "actions";
  block_id?: string;
  // To be specified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: Array<any>;
}

export interface SlackContextBlock {
  type: "context";
  block_id?: string;
  // To be specified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: Array<any>;
}

export interface SlackInputBlock {
  type: "input";
  block_id?: string;
  label: SlackBlockText;
  // To be specified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: any;
  hint?: SlackBlockText;
  optional?: boolean;
  dispatch_action?: boolean;
}

export interface SlackFileBlock {
  type: "file";
  block_id?: string;
  external_id: string;
  source: string;
}

export interface SlackStarsItemFile {
  file: SlackFile;
  channel: string;
  date_create: Date;
}

export interface SlackFile {
  id: string;
  created?: Date;
  timestamp?: Date;
  name?: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  pretty_type?: string;
  external_type?: string;
  user?: string;
  username?: string;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
  permalink_public?: string;
  reactions?: Array<SlackReactionDetails>;
  editable?: boolean;
  is_external?: boolean;
  is_public?: boolean;
  public_url_shared?: boolean;
  display_as_bot?: boolean;
  is_starred?: boolean;
  has_rich_preview?: boolean;
}

export interface SlackStarsItemFileComment {
  file: SlackFile;
  file_comment: string;
  channel: string;
  date_create: Date;
}

export interface SlackStarsItemChannel {
  channel: string;
  date_create: Date;
}

export interface SlackStarsItemIm {
  channel: string;
  date_create: Date;
}

export interface SlackStarsItemGroup {
  group: string;
  date_create: Date;
}

export interface SlackMessageDetails {
  url: string;
  message: SlackHistoryMessage;
  channel: SlackChannelInfo;
  sender: SlackMessageSenderDetails;
  team: SlackTeamInfo;
}

export type SlackMessageSenderDetails = { type: "User"; content: SlackUser } | { type: "Bot"; content: SlackBotInfo };

export interface SlackUser {
  id: string;
  team_id?: string;
  name?: string;
  locale?: string;
  profile?: SlackUserProfile;
  is_admin?: boolean;
  is_app_user?: boolean;
  is_bot?: boolean;
  is_invited_user?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_stranger?: boolean;
  is_ultra_restricted?: boolean;
  has_2fa?: boolean;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  updated?: Date;
  deleted?: boolean;
  color?: string;
  real_name?: string;
  enterprise_user?: SlackEnterpriseUser;
}

export interface SlackUserProfile {
  id?: string;
  display_name?: string;
  real_name?: string;
  real_name_normalized?: string;
  avatar_hash?: string;
  status_text?: string;
  status_expiration?: Date;
  status_emoji?: string;
  display_name_normalized?: string;
  email?: string;
  team?: string;
  image_original?: string;
  image_default?: boolean;
  image_24?: string;
  image_32?: string;
  image_34?: string;
  image_44?: string;
  image_48?: string;
  image_68?: string;
  image_72?: string;
  image_88?: string;
  image_102?: string;
  image_132?: string;
  image_192?: string;
  image_230?: string;
  image_512?: string;
}

export interface SlackEnterpriseUser {
  id: string;
  enterprise_id: string;
  enterprise_name?: string;
  teams?: Array<string>;
  is_admin?: boolean;
  is_app_user?: boolean;
  is_bot?: boolean;
  is_invited_user?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_stranger?: boolean;
  is_ultra_restricted?: boolean;
  has_2fa?: boolean;
}

export interface SlackBotInfo {
  id?: string;
  name: string;
  updated?: Date;
  app_id: string;
  user_id: string;
  icons?: SlackIcon;
}

export interface SlackTeamInfo {
  id: string;
  name?: string;
  domain?: string;
  email_domain?: string;
  icon?: SlackIcon;
}

export interface SlackIcon {
  image_original?: string;
  image_default?: boolean;
  image_24?: string;
  image_32?: string;
  image_34?: string;
  image_44?: string;
  image_48?: string;
  image_68?: string;
  image_72?: string;
  image_88?: string;
  image_102?: string;
  image_132?: string;
  image_192?: string;
  image_230?: string;
  image_512?: string;
}

export interface SlackChannelInfo {
  id: string;
  created: Date;
  creator?: string;
  name?: string;
  name_normalized?: string;
  topic?: SlackChannelTopicInfo;
  purpose?: SlackChannelPurposeInfo;
  previous_names?: Array<string>;
  priority?: number;
  num_members?: number;
  locale?: string;
  is_channel?: boolean;
  is_group?: boolean;
  is_im?: boolean;
  is_archived?: boolean;
  is_general?: boolean;
  is_shared?: boolean;
  is_org_shared?: boolean;
  is_member?: boolean;
  is_private?: boolean;
  is_mpim?: boolean;
  is_user_deleted?: boolean;
  last_read?: string;
  unread_count?: number;
  unread_count_display?: number;
}

export interface SlackChannelTopicInfo {
  value: string;
  creator?: string;
  last_set?: Date;
}

export interface SlackChannelPurposeInfo {
  value: string;
  creator?: string;
  last_set?: Date;
}

export interface SlackChannelDetails {
  channel: SlackChannelInfo;
  team: SlackTeamInfo;
}

export interface SlackFileDetails {
  channel: SlackChannelInfo;
  sender?: SlackUser;
  team: SlackTeamInfo;
}

export interface SlackFileCommentDetails {
  channel: SlackChannelInfo;
  team: SlackTeamInfo;
}

export interface SlackImDetails {
  channel: SlackChannelInfo;
  team: SlackTeamInfo;
}

export interface SlackGroupDetails {
  channel: SlackChannelInfo;
  team: SlackTeamInfo;
}
