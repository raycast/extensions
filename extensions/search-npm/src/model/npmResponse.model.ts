export type NpmFetchResponse = {
  objects: FetchResponseObject[];
  total: number;
  time: string;
};

export type FetchResponseObject = {
  downloads: {
    monthly: number;
    weekly: number;
  };
  dependents: string;
  updated: string;
  searchScore: number;
  package: Package;
  score: {
    final: number;
    detail: Detail;
  };
  flags: {
    insecure: number;
  };
};

export interface Package {
  name: string;
  scope: string;
  version: string;
  description: string;
  date: string;
  links: Links;
  author?: Author;
  publisher: Publisher;
  maintainers: Maintainer[];
  keywords?: string[];
}

export interface Links {
  npm: string;
  homepage?: string;
  repository?: string;
  bugs?: string;
}

export interface Author {
  name: string;
  email?: string;
  username?: string;
  url?: string;
}

export interface Publisher {
  username: string;
  email: string;
}

export interface Maintainer {
  username: string;
  email: string;
}

export interface Detail {
  quality: number;
  popularity: number;
  maintenance: number;
}
