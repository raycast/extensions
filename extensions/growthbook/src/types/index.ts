export type Environments = Record<string, EnvironmentDetails>;

export type EnvironmentDetails = {
  defaultValue: string;
  enabled: boolean;
  rules: any[];
  definition?: string;
};

export type Feature = {
  id: string;
  description: string;
  archived: boolean;
  dateCreated: string;
  dateUpdated: string;
  defaultValue: string;
  environments: Environments;
  owner: string;
  project: string;
  tags: string[];
  valueType: string;
  revision: {
    comment: string;
    date: string;
    publishedBy: string;
    version: number;
  };
};

export type GrowthbookResponse = {
  features: Feature[];
};
