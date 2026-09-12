interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface Game {
  creatorId: number;
  creatorName: string;
  creatorType: string;
  totalUpVotes: number;
  totalDownVotes: number;
  universeId: number;
  name: string;
  placeId: number;
  playerCount: number;
  imageToken: string;
  isSponsored: boolean;
  nativeAdData: string;
  isShowSponsoredLabel: boolean;
  price?: number;
  analyticsIdentifier?: string;
  gameDescription: string;
  genre: string;
}

export interface SortResponse {
  sorts: {
    token: string;
    name: string;
    displayName: string;
    gameSetTypeId: number;
    // assumed type
    gameSetTargetId?: number;
    timeOptionsAvailable: boolean;
    genreOptionsAvailable: boolean;
    numberOfRows: number;
    numberOfGames: number;
    isDefaultSort: boolean;
    // assumed type
    contextUniverseId?: number;
    contextCountryRegionId: number;
    tokenExpiryInSeconds: number;
  }[];
  timeFilters: {
    token: string;
    name: string;
    tokenExpiryInSeconds: number;
  }[];
  genreFilters: {
    token: string;
    name: string;
    tokenExpiryInSeconds: number;
  }[];
  gameFilters: {
    token: string;
    name: string;
    tokenExpiryInSeconds: number;
  }[];
  pageContext: {
    pageId: string;
    // assumed type
    isSeeAllPage?: boolean;
  };
  // assumed type
  gameSortStyle?: string;
}

interface Thumbnail {
  requestId: string;
  errorCode: number;
  errorMessage: string;
  targetId: number;
  state: string;
  imageUrl: string;
}
