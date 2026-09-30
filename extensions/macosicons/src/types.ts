export type SearchIcon = {
  objectID: string;
  appName: string;
  timeStamp: number;
  icnsUrl: string;
  downloads: number;
  usersName: string;
  category: string;
  lowResPngUrl: string;
  uploadedBy: string;
};

export type IconMetadata = Omit<SearchIcon, "appName" | "timeStamp"> & {
  name: string;
  uploadedAt: number;
  updatedAt: number;
};

export type IconsResponse = {
  hits: Array<IconMetadata>;
  hitsPerPage: number;
  totalHits: number;
  totalDocuments: number;
  query: string;
  totalPages: number;
  page: number;
};
