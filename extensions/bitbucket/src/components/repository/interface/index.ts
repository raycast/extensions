export type Repository = {
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
};

export type Patch = {
  text?: string;
  tags?: string[];
  timee?: number;
  timeEnd?: number;
};

export type Pipeline = {
  uuid: string;
  name: string;
  buildNumber: string;
  state: string;
  avatarCreatorUrl: string;
  triggerName: string;
  commitMessage: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: any;
  createdOn: string;
};
