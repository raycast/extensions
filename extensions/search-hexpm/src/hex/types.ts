export type Downloads = {
  all: number;
  day: number;
  recent: number;
  week: number;
};

export type Meta = {
  links: [Link];
  licenses: [string];
  description: string;
};

export type Configs = {
  [language: string]: string;
};

export type Release = {
  version: string;
  url: string;
};

export type Link = {
  url: string;
};

type ResultAttributes = { [key: string]: boolean | string | string[] | number | Downloads | Meta };

export type HexSearchResult = ResultAttributes & {
  name: string;
  latest_version: string;
  inserted_at: string;
  downloads: Downloads;
  meta: Meta;
  docs_html_url: string;
  html_url: string;
  configs: Configs;
  releases: [Release];
};

export type HexSearchResponse = HexSearchResult[];

export type Dependency = {
  [name: string]: {
    app: string;
    optional: boolean;
    requirement: string;
  };
};

export type HexDetailResponse = HexSearchResult & {
  checksum: string;
  requirements: Dependency;
};
