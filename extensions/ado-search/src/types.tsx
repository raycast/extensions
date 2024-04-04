export type AdoGitrepostitoriesResponse = {
  value: Repository[];
};

export type Repository = {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  project: Project;
  remoteUrl: string;
  sshUrl: string;
  webUrl: string;
  isDisabled: boolean;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  url: string;
  projectUrl: string;
};