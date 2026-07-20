export type SessionStatus =
  | "working"
  | "blocked"
  | "expired"
  | "finished"
  | "suspend_requested"
  | "suspend_requested_frontend"
  | "resume_requested"
  | "resume_requested_frontend"
  | "resumed"
  | "unknown"
  | (string & {});

export type SessionMessage = {
  author?: string;
  body: string;
  createdAt?: string;
};

export type SessionSummary = {
  id: string;
  title: string;
  status: SessionStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  playbookId?: string;
  snapshotId?: string;
  requestingUserEmail?: string;
  pullRequestUrl?: string;
  structuredOutput?: unknown;
  tags: string[];
  url: string;
};

export type SessionDetail = SessionSummary & {
  messages: SessionMessage[];
};

export type SessionListResult = {
  sessions: SessionSummary[];
  hasMore: boolean;
  nextOffset: number;
};

export type CreateSessionInput = {
  prompt: string;
  title?: string;
  tags?: string[];
  snapshotId?: string;
  playbookId?: string;
  maxAcuLimit?: number;
  unlisted?: boolean;
  idempotent?: boolean;
};

export type CreateSessionResult = {
  id: string;
  url: string;
  isNewSession: boolean;
};

export type DevinClient = {
  listSessions(input: {
    limit?: number;
    offset?: number;
    tags?: string[];
    userEmail?: string;
  }): Promise<SessionListResult>;
  getSession(sessionId: string): Promise<SessionDetail>;
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  sendMessage(sessionId: string, message: string): Promise<string>;
};
