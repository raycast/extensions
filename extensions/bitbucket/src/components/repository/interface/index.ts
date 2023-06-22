export interface Repository {
  uuid: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  fullName: string;
  url: string;
  clone: {
    ssh?: string;
    https?: string;
  };
}

export interface Patch {
  text?: string;
  tags?: string[];
  timee?: number;
  timeEnd?: number;
}

export interface Pipeline {
  uuid: string;
  name: string;
  buildNumber: string;
  state: string;
  avatarCreatorUrl: string;
  triggerName: string;
  commitMessage: string;
  target: any;
  createdOn: string;
}
