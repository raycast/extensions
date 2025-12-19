import type { ConfluenceIcon, ConfluenceSearchLinks } from "@/types";

export type ConfluenceContentSearchResponse = {
  results: ConfluenceContentSearchResult[];
  start: number;
  limit: number;
  size: number;
  cqlQuery: string;
  searchDuration: number;
  /**
   * Note: The API documentation states 'totalCount', but the actual response returns 'totalSize'. It's unclear which one is correct.
   */
  totalCount?: number;
  /**
   * Note: The API documentation states 'totalCount', but the actual response returns 'totalSize'. It's unclear which one is correct.
   */
  totalSize?: number;
  _links: ConfluenceSearchLinks;
};

type ConfluenceContentSearchResult = {
  id: string;
  type: string;
  status: string;
  title: string;
  space: ConfluenceContentSpace;
  position: number;
  extensions: ConfluenceContentExtensions;
  _links: ConfluenceContentLinks;
  history: ConfluenceContentHistory;
  metadata: ConfluenceContentMetadata;
  _expandable: ConfluenceContentExpandable;
};

type ConfluenceContentSpace = {
  id: number;
  key: string;
  name: string;
  type: string;
  status: string;
  _links: {
    webui: string;
    self: string;
  };
  _expandable: {
    metadata: string;
    icon: string;
    description: string;
    retentionPolicy: string;
    homepage: string;
  };
};

type ConfluenceContentExtensions = {
  position: string;
};

type ConfluenceContentLinks = {
  webui: string;
  edit: string;
  tinyui: string;
  self: string;
};

type ConfluenceContentHistory = {
  latest: boolean;
  createdBy: ConfluenceContentUser;
  createdDate: string;
  lastUpdated: ConfluenceContentLastUpdated;
  _links: {
    self: string;
  };
  _expandable: {
    lastUpdated: string;
    previousVersion: string;
    contributors: string;
    nextVersion: string;
  };
};

type ConfluenceContentUser = {
  type: string;
  username: string;
  userKey: string;
  profilePicture: ConfluenceIcon;
  displayName: string;
  _links: {
    self: string;
  };
  _expandable: {
    status: string;
  };
};

type ConfluenceContentLastUpdated = {
  by: ConfluenceContentUser;
  when: string;
  message: string;
  number: number;
  minorEdit: boolean;
  hidden: boolean;
  _links: {
    self: string;
  };
  _expandable: {
    content: string;
  };
};

type ConfluenceContentMetadata = {
  currentuser: ConfluenceContentCurrentUser;
  _expandable: {
    properties: string;
    frontend: string;
    editorHtml: string;
    labels: string;
  };
};

type ConfluenceContentCurrentUser = {
  favourited?: {
    isFavourite: boolean;
    favouritedDate: number;
  };
  _expandable: {
    lastmodified: string;
    viewed: string;
    lastcontributed: string;
  };
};

type ConfluenceContentExpandable = {
  container: string;
  metadata: string;
  operations: string;
  children: string;
  restrictions: string;
  history: string;
  ancestors: string;
  descendants: string;
};
