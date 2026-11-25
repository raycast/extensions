export type ScreenStatus = "online" | "offline" | "pairing";

export interface Screen {
  id: string;
  name: string;
  status: ScreenStatus;
  lastSeenAt: string | null;
  nodeId: string | null;
  nodeName: string | null;
  contentKind: string | null;
  contentId: string | null;
  contentName: string | null;
  tags: string[] | null;
  timezone: string | null;
  activeEmergencyId: string | null;
  activeCastId: string | null;
  castHeadline: string | null;
  emergencyHeadline: string | null;
  liveThumbnailAt: string | null;
  displayOffSince: string | null;
  deactivatedAt: string | null;
}

export interface MediaFile {
  id: string;
  name: string;
  kind: string;
  state: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  tags: string[] | null;
  thumbnailUrl: string | null;
  usageCount: number;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  approvalState: string;
  usedByScreenCount: number;
  items: unknown[];
  updatedAt: string;
}

export interface Me {
  actor: { kind?: string; id?: string; name?: string | null; email?: string | null; nodeId?: string | null };
  workspace: { id: string; name: string | null };
  permissions: "all" | string[];
}

export interface OrgNode {
  id: string;
  name: string | null;
  parentId: string | null;
  isSpace?: boolean;
}

/** The content kinds `POST /v1/screens/:id/assign` takes, with console names. */
export const CONTENT_KIND_LABEL: Record<string, string> = {
  playlist: "Playlist",
  media: "File",
  schedule: "Schedule",
  layout: "Layout",
  creative: "Design",
  signage: "Template",
  app: "App",
};
