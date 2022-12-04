export type Crate = {
  id: string;
  name: string;
  repository: string;
  description: string;
  documentation: string;
  downloads: number;
  recent_downloads: number;
  exact_match: boolean;
  categories: string[];
  homepage: string;
  keywords: string[];
  badges: string[];
  links: {
    owner_team: string;
    owners: string;
    owner_user: string;
    reverse_dependencies: string;
    version_downloads: string;
    versions: string;
  };
  owners?: Owner[];
  max_version: string;
  max_stable_version: string;
  updated_at: Date;
  created_at: Date;
  versions: unknown;
};

export enum OwnerType {
  Team,
  User,
}

export type Owner = {
  id: number;
  avatar: string;
  kind: OwnerType;
  name: string;
  url: string;
  login: string;
};
