export type GitignoreFile = {
  id: string;
  name: string;
  path: string;
  folder: string | undefined;
};

export type State = {
  gitignoreFiles: GitignoreFile[];
  loading: boolean;
  lastUpdated: Date | null;
};

export type Preferences = {
  listdetail: boolean;
  autoselect: boolean;
};
