export type BridgePublicHealth = {
  ok: boolean;
  bridge: string;
};

export type BridgeAuthedHealth = BridgePublicHealth & {
  version: string;
  isPro: boolean;
  port: number;
  activeWorkspaceId: string | null;
};

export type BridgeErrorBody = {
  error: string;
};

export type SearchResultItem = {
  id: string;
  workspaceId: string;
  providerType: string;
  externalKey: string;
  title: string;
  status: string;
  priority: string | null;
  issueType: string | null;
  assigneeDisplayName: string | null;
  localTrack: string | null;
  rank: number;
};

export type TodayBoardResponse = {
  active: TodayTicketItem[];
  stuck: TodayTicketItem[];
  next: TodayTicketItem[];
  done: TodayTicketItem[];
  date: string;
};

export type TodayTicketItem = {
  id: string;
  workspaceId: string;
  providerType: string;
  externalKey: string;
  title: string;
  status: string;
  priority: string | null;
  assigneeDisplayName: string | null;
  localTrackNote: string | null;
};

export type IssueDetailResponse = {
  id: string;
  workspaceId: string;
  providerType: string;
  externalKey: string;
  externalId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  issueType: string | null;
  assigneeDisplayName: string | null;
  localTrack: string | null;
  localTrackNote: string | null;
  syncStatus: string;
  updatedAt: string;
  comments: IssueComment[];
  worklogs: IssueWorklog[];
};

export type IssueComment = {
  id: string;
  authorName: string | null;
  body: string | null;
  createdAt: string | null;
};

export type IssueWorklog = {
  id: string;
  startedAt: string;
  timeSpentSeconds: number;
  comment: string | null;
};

export type WorkspaceItem = {
  id: string;
  name: string;
  providerType: string;
  isActive: boolean;
};
