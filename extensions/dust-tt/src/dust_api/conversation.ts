/**
 * Mentions
 */
import { UserType, WorkspaceType } from "./user";
import { AgentConfigurationType } from "./agent";

export type AgentMention = {
  configurationId: string;
};

export type UserMention = {
  provider: string;
  providerId: string;
};

export type MentionType = AgentMention | UserMention;

export type MessageVisibility = "visible" | "deleted";

export function isAgentMention(arg: MentionType): arg is AgentMention {
  return (arg as AgentMention).configurationId !== undefined;
}

export function isUserMention(arg: MentionType): arg is UserMention {
  const maybeUserMention = arg as UserMention;
  return maybeUserMention.provider !== undefined && maybeUserMention.providerId !== undefined;
}

export type ConversationMessageReactions = {
  messageId: string;
  reactions: MessageReactionType[];
}[];

export type MessageReactionType = {
  emoji: string;
  users: {
    userId: number | null;
    username: string;
    fullName: string | null;
  }[];
};

/**
 * User messages
 */

export type UserMessageContext = {
  username: string;
  timezone: string;
  fullName: string | null;
  email: string | null;
  profilePictureUrl: string | null;
};

export type UserMessageType = {
  id: number;
  created: number;
  type: "user_message";
  sId: string;
  visibility: MessageVisibility;
  version: number;
  user: UserType | null;
  mentions: MentionType[];
  content: string;
  context: UserMessageContext;
};

export function isUserMessageType(
  arg: UserMessageType | AgentMessageType | ContentFragmentType,
): arg is UserMessageType {
  return arg.type === "user_message";
}

/**
 * Agent messages
 */

export type AgentMessageStatus = "created" | "succeeded" | "failed" | "cancelled";

/**
 * Both `action` and `message` are optional (we could have a no-op agent basically).
 *
 * Since `action` and `message` are bundled together, it means that we will only be able to retry
 * them together in case of error of either. We store an error only here whether it's an error
 * coming from the action or from the message generation.
 */
export type AgentMessageType = {
  id: number;
  created: number;
  type: "agent_message";
  sId: string;
  visibility: MessageVisibility;
  version: number;
  parentMessageId: string | null;

  configuration: AgentConfigurationType;
  status: AgentMessageStatus;
  content: string | null;
  error: {
    code: string;
    message: string;
  } | null;
};

/**
 * Content Fragments
 */
export type ContentFragmentContextType = {
  username: string | null;
  fullName: string | null;
  email: string | null;
  profilePictureUrl: string | null;
};

export type ContentFragmentContentType = "slack_thread_content" | "file_attachment";

export type ContentFragmentType = {
  id: number;
  sId: string;
  created: number;
  type: "content_fragment";
  visibility: MessageVisibility;
  version: number;

  title: string;
  content: string;
  url: string | null;
  contentType: ContentFragmentContentType;
  context: ContentFragmentContextType;
};

export function isContentFragmentType(
  arg: UserMessageType | AgentMessageType | ContentFragmentType,
): arg is ContentFragmentType {
  return arg.type === "content_fragment";
}

/**
 * Conversations
 */

export type ConversationVisibility = "unlisted" | "workspace" | "deleted";

/**
 * content [][] structure is intended to allow retries (of agent messages) or edits (of user
 * messages).
 */
export type ConversationType = {
  id: number;
  created: number;
  sId: string;
  owner: WorkspaceType;
  title: string | null;
  visibility: ConversationVisibility;
  content: (UserMessageType[] | AgentMessageType[] | ContentFragmentType[])[];
};
