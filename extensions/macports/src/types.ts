export interface SearchResult {
  name: string;
  description?: string;
  username?: string;
  url: string;
  installed: boolean;
  version?: string;
}

export interface MacPortsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Port[];
}

export interface Port {
  name: string;
  portdir: string;
  version: string;
  license: string;
  platforms: string;
  epoch: number;
  replaced_by: string | null;
  homepage: string;
  description: string;
  long_description: string;
  active: boolean;
  categories: string[];
  maintainers: Maintainer[];
  variants: string[];
  dependencies: Dependency[];
  depends_on: DependsOn[];
}

export interface Dependency {
  type: string;
  ports: (string | null)[];
}

export interface DependsOn {
  type: string;
  ports: string[];
}

export type Maintainer = {
  email?: string;
  github?: string;
  avatarUrl?: string;
};

export type PortDetails = {
  name: string;
  description: string;
  homepage: string;
  maintainers: Maintainer[];
  variants: string[];
  dependencies: string[];
  version: string;
};
