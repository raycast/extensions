export interface ResourceListItem {
  id: string;
  name: string;
  address: string;
  networkName: string;
  alias?: string;
  url: string;
}

export interface TwingateResource {
  id: string;
  name: string;
  address: {
    value: string;
  };
  remoteNetwork: {
    name: string;
  };
  alias?: string;
}

export interface Favorite {
  id: string;
  name: string;
  timestamp: number;
}

export interface RecentResource {
  id: string;
  name: string;
  url: string;
  address: string;
  networkName: string;
  alias?: string;
  timestamp: number;
}

export interface UserPreferences {
  debugMode: boolean;
}

export interface ResourcesQueryResponse {
  resources: {
    edges: Array<{
      node: TwingateResource;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}
