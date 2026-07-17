export type PostStatus = "draft" | "buffer" | "sent" | "sending" | "failed";

export interface Asset {
  id: string | null;
  type: string;
  mimeType: string;
  source: string;
  thumbnail: string;
}

export interface PostMetric {
  type: string;
  name: string;
  description: string;
  value: number;
  unit: string;
}

export interface Channel {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  avatar: string;
  isDisconnected: boolean;
  isLocked: boolean;
}

export interface Post {
  id: string;
  status: PostStatus;
  text: string;
  externalLink: string | null;
  channelId: string;
  channelService: string;
  createdAt: string;
  dueAt: string | null;
  sentAt: string | null;
  channel: Pick<Channel, "id" | "name" | "displayName" | "service" | "avatar">;
  assets: Asset[];
  metrics: PostMetric[] | null;
  metricsUpdatedAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
}

export interface IdeaGroup {
  id: string;
  name: string;
  isLocked: boolean;
}

export interface AggregatedPostMetrics {
  metrics: PostMetric[];
  metricsUpdatedAt: string | null;
}
