export type Config = {
  baseUrl: string;
};

export type Component = {
  id: string;
  title: string;
  name: string;
  importPath: string;
  tags: string[];
};

export type IndexData = {
  entries: { [id: string]: Component };
};

export type StoriesData = {
  stories: { [id: string]: Component };
};
