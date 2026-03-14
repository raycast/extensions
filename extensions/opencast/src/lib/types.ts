import type {
  Message,
  Part,
  PermissionRequest,
  QuestionRequest,
  Session,
  SessionStatus,
  Todo,
} from "@opencode-ai/sdk/v2";

export type OpencodeTarget = {
  directory: string;
  workspace?: string;
};

export type RecentTarget = OpencodeTarget & {
  label: string;
  lastUsedAt: number;
};

export type RecentSession = {
  id: string;
  title: string;
  targetKey: string;
  lastOpenedAt: number;
};

export type MessageWithParts = {
  info: Message;
  parts: Part[];
};

export type ModelOption = {
  providerID: string;
  modelID: string;
  title: string;
  providerTitle: string;
  subtitle?: string;
  isDefault?: boolean;
  isConnected?: boolean;
};

export type ComposerState = {
  draft: string;
  isSending: boolean;
};

export type ConversationBlock =
  | {
      id: string;
      kind: "message";
      role: "user" | "assistant";
      messageID: string;
      title: string;
      subtitle?: string;
      markdown?: string;
      timestamp?: number;
    }
  | {
      id: string;
      kind: "reasoning-summary";
      messageID: string;
      title: string;
      subtitle?: string;
      detailMarkdown: string;
      timestamp?: number;
    }
  | {
      id: string;
      kind: "tool-call";
      messageID: string;
      title: string;
      subtitle?: string;
      status: "pending" | "running" | "completed" | "error";
      detailMarkdown: string;
      timestamp?: number;
    }
  | {
      id: string;
      kind: "step";
      messageID: string;
      title: string;
      subtitle?: string;
      detailMarkdown?: string;
      timestamp?: number;
    }
  | {
      id: string;
      kind: "file";
      messageID: string;
      title: string;
      subtitle?: string;
      detailMarkdown: string;
      timestamp?: number;
    };

export type PendingState = {
  permissions: PermissionRequest[];
  questions: QuestionRequest[];
};

export type SessionTranscriptState = {
  sessionID: string;
  messages: MessageWithParts[];
  status?: SessionStatus;
  error?: string;
  todos: Todo[];
  pending: PendingState;
};

export type SessionSummary = {
  info: Session;
  status?: SessionStatus;
  pendingCount: number;
  preview: string;
};

export type WorkspaceOption = {
  id: string;
  name: string | null;
  directory: string | null;
  branch: string | null;
  type: string;
};
