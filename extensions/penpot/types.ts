export type Project = {
  id: string;
  teamId: string;
  createdAt: string;
  modifiedAt: string;
  isDefault: boolean;
  name: string;
  teamName: string;
  isDefaultTeam: boolean;
};

export type FileThumbnails = Record<string, string>;

export type Team = {
  name: string;
  id: string;
  isDefault: boolean;
  createdAt: string;
  modifiedAt: string;
};

export type ProjectFile = {
  id: string;
  projectId: string;
  createdAt: string;
  modifiedAt: string;
  name: string;
  revn: number;
  isShared: boolean;
  thumbnailId: string;
};

export type PenpotPreferences = {
  accessToken: string;
};
