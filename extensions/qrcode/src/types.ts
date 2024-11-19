export interface LinkItem {
  id: string;
  title: string;
  url: string;
}

export interface URLInfo {
  protocol: string;
  host: string;
  path: string;
  query: string;
  hash: string;
}

export interface Preferences {
  language: string;
}

export interface Language {
  id: string;
  name: string;
  code: string;
}
