import type {
  ConfluenceIcon,
  ConfluenceSearchLinks,
  ConfluenceEntityType,
  ConfluenceContentSearchResponse,
} from "@/types";

export type ConfluenceSearchResponse = {
  results: ConfluenceSearchResult[];
  start: number;
  limit: number;
  size: number;
  /**
   * Note: The API documentation states 'totalCount', but the actual response returns 'totalSize'. It's unclear which one is correct.
   */
  totalCount?: number;
  /**
   * Note: The API documentation states 'totalCount', but the actual response returns 'totalSize'. It's unclear which one is correct.
   */
  totalSize?: number;
  cqlQuery: string;
  searchDuration: number;
  _links: ConfluenceSearchLinks;
};

type ConfluenceSearchResult = {
  content?: ConfluenceContentSearchResponse["results"][number];
  user?: ConfluenceUser;
  space?: ConfluenceSpace;
  title: string;
  excerpt: string;
  url: string;
  resultGlobalContainer?: {
    title: string;
    displayUrl: string;
  };
  entityType: ConfluenceEntityType;
  iconCssClass: string;
  lastModified: string;
  friendlyLastModified: string;
  timestamp: number;
};

type ConfluenceUser = {
  type: string;
  status: string;
  username: string;
  userKey?: string;
  profilePicture: ConfluenceIcon;
  displayName: string;
  _links: {
    self: string;
  };
};

type ConfluenceSpace = {
  id: number;
  key: string;
  name: string;
  status: string;
  type: string;
  icon: {
    path: string;
    width: number;
    height: number;
    isDefault: boolean;
  };
  description?: {
    plain: {
      value: string;
      representation: string;
    };
    _expandable: {
      view: string;
    };
  };
  metadata?: {
    labels: {
      results: Array<{
        prefix: string;
        name: string;
        id: string;
        label: string;
      }>;
      start: number;
      limit: number;
      size: number;
    };
  };
  _links: {
    self: string;
    webui: string;
  };
  _expandable: {
    retentionPolicy: string;
    homepage: string;
  };
};
