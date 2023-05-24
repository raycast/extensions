export type API = TAlgolia | TMeilisearch;

type UUID = string;

type base = {
  id: UUID;
  name: string;
  icon: string;
  apiKey: string;
  indexName: string;
  homepage: string;
};

export type TAlgolia = base & {
  appId: string;
  lang?: string;
  searchParameters?: object;
  type: "algolia";
};

export type TMeilisearch = base & {
  apiHost: string;
  type: "meilisearch";
};
