export interface Readme {
  type: string;
  encoding: string;
  size: number;
  name: string;
  path: string;
  content: string;
  sha: string;
  url: string;
  html_url: string;
  download_url: string;
  _links: Links;
}

export interface Links {
  self: string;
  html: string;
}
