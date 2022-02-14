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
  analyticsIdentifier?: any;
  gameDescription: string;
  genre: string;
}
