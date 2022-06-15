export interface Topic {
  name: string;
  sha: string;
  type: string;
  path: string;
  filepath: string;
  title: string;
}

export interface Tree {
  path: string;
  type: string;
  sha: string;
}

export interface Example {
  name: string;
  url: string;
}
