export type Preferences = {
  baseUrl: string;
  nameFilterRegExp?: string;
};

export type Story = {
  id: string;
  title: string;
  name: string;
  importPath: string;
  tags: string[];
};

export type IndexData = {
  entries: { [id: string]: Story };
};

export type StoriesData = {
  stories: { [id: string]: Story };
};
