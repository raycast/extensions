export type Project = {
  id: string;
  filename: string;
  pathname: string;
  lastModifiedTime: Date;
  gitBranch: string | null;
  diskSize: string | null;
  archived: boolean;
};
