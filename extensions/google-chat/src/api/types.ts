/**
 * Types for the parts of the Google Chat API v1 and People API v1 this extension uses.
 * Field names and enums follow the official discovery documents:
 * https://chat.googleapis.com/$discovery/rest?version=v1 and
 * https://people.googleapis.com/$discovery/rest?version=v1
 */

export type SpaceType = "SPACE_TYPE_UNSPECIFIED" | "SPACE" | "GROUP_CHAT" | "DIRECT_MESSAGE";

/** `Space` schema. Only the fields the extension reads. */
export interface Space {
  /** `spaces/{space}` */
  name: string;
  displayName?: string;
  spaceType?: SpaceType;
  /** Timestamp of the last message in the space (RFC 3339). */
  lastActiveTime?: string;
  createTime?: string;
  /** Link that opens the space in Google Chat. */
  spaceUri?: string;
  singleUserBotDm?: boolean;
  spaceThreadingState?:
    "SPACE_THREADING_STATE_UNSPECIFIED" | "THREADED_MESSAGES" | "GROUPED_MESSAGES" | "UNTHREADED_MESSAGES";
  spaceDetails?: { description?: string; guidelines?: string };
  membershipCount?: { joinedDirectHumanUserCount?: number; joinedGroupCount?: number };
}

/** `User` schema. Under user auth only `name` is guaranteed. */
export interface ChatUser {
  /** `users/{user}`; the numeric id matches People API `people/{id}`. */
  name: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  domainId?: string;
  type?: "TYPE_UNSPECIFIED" | "HUMAN" | "BOT";
  isAnonymous?: boolean;
}

export interface Thread {
  /** `spaces/{space}/threads/{thread}` */
  name?: string;
  threadKey?: string;
}

export interface Emoji {
  unicode?: string;
  customEmoji?: { name?: string; uid?: string; emojiName?: string; temporaryImageUri?: string };
}

export interface EmojiReactionSummary {
  emoji?: Emoji;
  reactionCount?: number;
}

export interface Annotation {
  type?: "ANNOTATION_TYPE_UNSPECIFIED" | "USER_MENTION" | "SLASH_COMMAND" | "RICH_LINK" | "CUSTOM_EMOJI";
  startIndex?: number;
  length?: number;
  userMention?: { user?: ChatUser; type?: "TYPE_UNSPECIFIED" | "ADD" | "MENTION" };
  richLinkMetadata?: { uri?: string; richLinkType?: string };
}

export interface Attachment {
  name?: string;
  contentName?: string;
  contentType?: string;
  downloadUri?: string;
  thumbnailUri?: string;
  source?: "SOURCE_UNSPECIFIED" | "DRIVE_FILE" | "UPLOADED_CONTENT";
  driveDataRef?: { driveFileId?: string };
}

/** `Message` schema. */
export interface Message {
  /** `spaces/{space}/messages/{message}` */
  name: string;
  sender?: ChatUser;
  createTime?: string;
  lastUpdateTime?: string;
  deleteTime?: string;
  text?: string;
  formattedText?: string;
  argumentText?: string;
  fallbackText?: string;
  thread?: Thread;
  threadReply?: boolean;
  /** Under user auth only `space.name` is populated. */
  space?: Partial<Space>;
  annotations?: Annotation[];
  attachment?: Attachment[];
  emojiReactionSummaries?: EmojiReactionSummary[];
}

/** `Membership` schema. */
export interface Membership {
  name: string;
  state?: "MEMBERSHIP_STATE_UNSPECIFIED" | "JOINED" | "INVITED" | "NOT_A_MEMBER";
  role?: "MEMBERSHIP_ROLE_UNSPECIFIED" | "ROLE_MEMBER" | "ROLE_MANAGER" | "ROLE_ASSISTANT_MANAGER";
  member?: ChatUser;
  createTime?: string;
}

/** `SpaceReadState` schema. */
export interface SpaceReadState {
  /** `users/{user}/spaces/{space}/spaceReadState` */
  name?: string;
  lastReadTime?: string;
}

export interface Reaction {
  name?: string;
  user?: ChatUser;
  emoji: Emoji;
}

export interface ListSpacesResponse {
  spaces?: Space[];
  nextPageToken?: string;
}

export interface ListMessagesResponse {
  messages?: Message[];
  nextPageToken?: string;
}

export interface ListMembershipsResponse {
  memberships?: Membership[];
  nextPageToken?: string;
}

/** `SearchMessagesRequest` body for `POST /v1/spaces/-/messages:search`. */
export interface SearchMessagesRequest {
  filter: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  view?: "SEARCH_MESSAGES_VIEW_UNSPECIFIED" | "SEARCH_MESSAGES_VIEW_BASIC" | "SEARCH_MESSAGES_VIEW_FULL";
}

export interface SearchMessageResult {
  message?: Message;
  /** Only returned with `SEARCH_MESSAGES_VIEW_FULL`. */
  read?: boolean;
  spaceMuteSetting?: "MUTE_SETTING_UNSPECIFIED" | "UNMUTED" | "MUTED";
}

export interface SearchMessagesResponse {
  results?: SearchMessageResult[];
  nextPageToken?: string;
}

/** People API `Person` (subset). */
export interface Person {
  /** `people/{id}` */
  resourceName: string;
  names?: { displayName?: string; givenName?: string; familyName?: string; metadata?: { primary?: boolean } }[];
  emailAddresses?: { value?: string; metadata?: { primary?: boolean } }[];
  photos?: { url?: string; default?: boolean; metadata?: { primary?: boolean } }[];
}

export interface SearchDirectoryPeopleResponse {
  people?: Person[];
  nextPageToken?: string;
  totalSize?: number;
}

export interface GetPeopleResponse {
  responses?: { requestedResourceName?: string; httpStatusCode?: number; person?: Person }[];
}

export type SpaceKind = "dm" | "space" | "group";

/** Space plus the title the extension shows for it (DM titles are resolved from members). */
export interface SpaceItem {
  space: Space;
  title: string;
  kind: SpaceKind;
  /** For DMs: the other person's email and avatar, when known. */
  email?: string;
  avatarUrl?: string;
  /** `users/{id}` of the other DM member, when known. */
  userName?: string;
}
