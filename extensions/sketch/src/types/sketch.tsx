export interface SketchErrorBody {
  code: number;
  errors?: null[] | null;
  message: string;
  status: string;
  type: string;
}

export interface BodyRes {
  data: Data;
}
export interface Data {
  workspace: Workspace;
}
export interface Workspace {
  __typename: string;
  identifier: string;
  shares: Shares;
}
export interface Shares {
  __typename: string;
  entries?: Share[] | null;
  meta: Meta;
}
export interface Share {
  __typename: string;
  allowedPrivateAccessLevels?: string[] | null;
  allowedWorkspaceAccessLevels?: string[] | null;
  createdAt: string;
  deletedAt?: null;
  identifier: string;
  isDraft: boolean;
  isShared: boolean;
  isSharedWithGuests: boolean;
  libraryEnabled: boolean;
  name: string;
  privacyIcon: string;
  project: Project;
  publicAccessLevel: string;
  publicCommentsEnabled: boolean;
  publicUrl: string;
  subscriptionStatus: string;
  updatedAt: string;
  userAccessLevel: string;
  userCanAccessVersions: boolean;
  userCanContribute: boolean;
  userCanLeaveShare: boolean;
  userCanUpdateCommentsEnabled: boolean;
  userCanUpdateSettings: boolean;
  userCanUpdateWorkspacePermissions: boolean;
  userHasAcceptedInvitationToView: boolean;
  userIsMember: boolean;
  userIsOwner: boolean;
  version: Version;
  workspace: Workspace1;
  workspaceAccessLevel: string;
  workspaceCommentsEnabled: boolean;
}
export interface Project {
  __typename: string;
  identifier: string;
  name: string;
  shortId: string;
  type: string;
}
export interface Version {
  __typename: string;
  createdAfterVersioning: boolean;
  createdAt: string;
  creator: Creator;
  document: Document;
  identifier: string;
  kind: string;
  previewFiles?: (PreviewFilesEntity | null)[] | null;
  shortId: string;
  updatedAt: string;
  userIsCreator: boolean;
}
export interface Creator {
  __typename: string;
  avatar: Avatar;
  identifier: string;
  name: string;
}
export interface Avatar {
  __typename: string;
  small: string;
}
export interface Document {
  __typename: string;
  assetStatus: string;
  colorspace?: string | null;
  downloadAvailable: boolean;
  downloadableAssets?: null[] | null;
  identifier: string;
  renderStatus: string;
  size?: number | null;
  sketchVersion: string;
  url: string;
  userCanOpenInApp: boolean;
}
export interface PreviewFilesEntity {
  __typename: string;
  height: number;
  identifier: string;
  thumbnails?: ThumbnailsEntity[] | null;
  url: string;
  width: number;
}
export interface ThumbnailsEntity {
  __typename: string;
  height: number;
  type: string;
  url: string;
  width: number;
}
export interface Workspace1 {
  __typename: string;
  avatar: Avatar1;
  identifier: string;
  name: string;
  type: string;
  userIsMember: boolean;
  userIsOwner: boolean;
}
export interface Avatar1 {
  __typename: string;
  large: string;
  small: string;
}
export interface Meta {
  __typename: string;
  after: string;
  before?: null;
  limit: number;
  totalCount: number;
}
