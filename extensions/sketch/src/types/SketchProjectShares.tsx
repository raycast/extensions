export interface ProjectSharesBodyRes {
  data: Data;
}
interface Data {
  project: Project;
}
interface Project {
  __typename: string;
  identifier: string;
  shares: Shares;
  type: string;
}
interface Shares {
  __typename: string;
  entries?: EntriesEntity[] | null;
  meta: Meta;
}
export interface EntriesEntity {
  userIsMember: boolean;
  userCanLeaveShare: boolean;
  allowedPrivateAccessLevels?: string[] | null;
  publicCommentsEnabled: boolean;
  identifier: string;
  userCanContribute: boolean;
  userCanUpdateCommentsEnabled: boolean;
  workspace: Workspace;
  privacyIcon: string;
  downloadEnabled: boolean;
  isDraft: boolean;
  version: Version;
  allowedWorkspaceAccessLevels?: string[] | null;
  userHasAcceptedInvitationToView: boolean;
  isSharedWithGuests: boolean;
  updatedAt: string;
  deletedAt?: null;
  tempWorkspaceAccessLevel: string;
  userIsOwner: boolean;
  project: Project1;
  workspaceCommentsEnabled: boolean;
  createdAt: string;
  subscriptionStatus: string;
  userCanUpdateWorkspacePermissions: boolean;
  isShared: boolean;
  userCanAccessVersions: boolean;
  libraryEnabled: boolean;
  publicUrl: string;
  publicAccessLevel: string;
  userCanUpdateSettings: boolean;
  name: string;
  userAccessLevel: string;
  __typename: string;
}
interface Workspace {
  __typename: string;
  avatar: Avatar;
  identifier: string;
  name: string;
  type: string;
  userIsMember: boolean;
  userIsOwner: boolean;
}
interface Avatar {
  __typename: string;
  large: string;
  small: string;
}
interface Version {
  __typename: string;
  createdAfterVersioning: boolean;
  createdAt: string;
  creator: Creator;
  document: Document;
  identifier: string;
  kind: string;
  previewFiles?: PreviewFilesEntity[] | null;
  shortId: string;
  updatedAt: string;
  userIsCreator: boolean;
}
interface Creator {
  __typename: string;
  avatar: Avatar1;
  identifier: string;
  name: string;
}
interface Avatar1 {
  __typename: string;
  small: string;
}
interface Document {
  __typename: string;
  assetStatus: string;
  colorspace?: null;
  downloadAvailable: boolean;
  downloadableAssets?: null[] | null;
  identifier: string;
  renderStatus: string;
  size: number;
  sketchVersion: string;
  url: string;
  userCanOpenInApp: boolean;
}
interface PreviewFilesEntity {
  __typename: string;
  height: number;
  identifier: string;
  thumbnails?: ThumbnailsEntity[] | null;
  url: string;
  width: number;
}
interface ThumbnailsEntity {
  __typename: string;
  height: number;
  type: string;
  url: string;
  width: number;
}
interface Project1 {
  __typename: string;
  identifier: string;
  name: string;
  shortId: string;
  type: string;
}
interface Meta {
  __typename: string;
  after?: null;
  before?: null;
  limit: number;
  totalCount: number;
}
