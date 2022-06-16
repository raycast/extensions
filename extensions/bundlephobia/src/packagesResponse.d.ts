export type NpmsFetchResponse = NpmsResultModel[];

export interface NpmsResultModel {
  package: Package;
  score: Score;
  searchScore: number;
  highlight: string;
}

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

export interface Score {
  final: number;
  detail: Detail;
}

export interface Detail {
  quality: number;
  popularity: number;
  maintenance: number;
}
