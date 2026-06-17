export type MavenModel = {
  responseHeader: ResponseHeader;
  response: MavenResponse;
  spellcheck: Spellcheck;
};

export type MavenResponse = {
  numFound: number;
  start: number;
  docs: Doc[];
};

export type Doc = {
  id: string;
  g: string;
  a: string;
  latestVersion: string;
  repositoryId: string;
  p: string;
  timestamp: number;
  versionCount: number;
  text: string[];
  ec: string[];
};

export type ResponseHeader = {
  status: number;
  QTime: number;
  params: Params;
};

export type Params = {
  q: string;
  core: string;
  defType: string;
  spellcheck: string;
  qf: string;
  indent: string;
  fl: string;
  start: string;
  sort: string;
  "spellcheck.count": string;
  rows: string;
  wt: string;
  version: string;
};

export type Spellcheck = {
  suggestions: never[];
};
