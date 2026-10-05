export type SeriesDefinition = {
  id: string;
  title: string;
  assetDirectory: string;
  sourceStateKey: string;
  order: number;
};

export type Screenshot = {
  id: string;
  seriesId: string;
  rawName: string;
  title: string;
  episode: number;
  previewUrl: string;
  copyUrl: string;
};

export type ScreenshotManifest = {
  schemaVersion: 1;
  sourceCommit: string;
  sourceWebsiteUrl: string;
  sourceRepositoryUrl: string;
  series: SeriesDefinition[];
  screenshots: Screenshot[];
};

export type CatalogFilter = "all" | "favorites" | "recent" | `series:${string}`;
