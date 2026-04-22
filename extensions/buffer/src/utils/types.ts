export type PostStatus =
  | "draft"
  | "needs_approval"
  | "scheduled"
  | "sending"
  | "sent"
  | "error";

export type ShareMode =
  | "addToQueue"
  | "shareNext"
  | "shareNow"
  | "customScheduled";

export interface OrganizationLimits {
  channels: number;
  members: number;
  scheduledPosts: number;
  scheduledThreadsPerChannel: number;
  scheduledStoriesPerChannel: number;
  generateContent: number;
  tags: number;
  ideas: number;
  ideaGroups: number;
  savedReplies: number;
}

export interface OrganizationMembers {
  totalCount: number;
}

export interface Organization {
  id: string;
  name: string;
  ownerEmail?: string;
  channelCount?: number;
  members?: OrganizationMembers;
  limits?: OrganizationLimits;
}

export interface AccountPreferencesDetails {
  timeFormat?: string;
  startOfWeek?: string;
  defaultScheduleOption?: string;
}

export interface ConnectedApp {
  clientId: string;
  userId: string;
  name: string;
  description: string;
  website: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  service: string;
  avatar?: string;
  displayName?: string;
  isDisconnected: boolean;
  isLocked: boolean;
  timezone: string;
  isQueuePaused?: boolean;
  externalLink?: string;
  descriptor?: string;
  type?: string;
  organizationId?: string;
}

export interface PostStatistics {
  reach?: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  impressions?: number;
}

export interface PostAsset {
  id?: string;
  type?: string;
  mimeType?: string;
  source: string;
  thumbnail?: string;
}

export interface PostError {
  message: string;
}

export interface Post {
  id: string;
  ideaId?: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
  dueAt?: string;
  sentAt?: string;
  externalLink?: string;
  channelId: string;
  channelService?: string;
  status: PostStatus;
  via?: string;
  shareMode?: ShareMode;
  isCustomScheduled?: boolean;
  sharedNow?: boolean;
  statistics?: PostStatistics;
  assets?: PostAsset[];
  error?: PostError | null;
  channel?: Channel;
}

export interface IdeaContent {
  title?: string;
  text?: string;
  services?: string[];
  date?: string;
}

export interface Idea {
  id: string;
  organizationId: string;
  createdAt?: number;
  updatedAt?: number;
  content: IdeaContent;
}

export interface Account {
  id: string;
  email: string;
  backupEmail?: string;
  avatar?: string;
  createdAt?: string;
  timezone?: string;
  name?: string;
  preferences?: AccountPreferencesDetails;
  connectedApps?: ConnectedApp[];
  organizations: Organization[];
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code: string } }>;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface PostsConnection {
  edges: Array<{ node: Post }>;
  pageInfo: PageInfo;
}

export interface GetPostsOptions {
  channelIds?: string[];
  cursor?: string;
  limit?: number;
  status?: PostStatus[];
  startDate?: Date;
  endDate?: Date;
}

export interface CreatePostInput {
  channelId: string;
  text: string;
  scheduledAt?: Date;
  service?: string;
  saveToDraft?: boolean;
  imageUrl?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  mode?: ShareMode;
}

export interface CreateIdeaInput {
  organizationId: string;
  title?: string;
  text?: string;
  date?: Date;
  services?: string[];
}
