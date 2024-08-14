interface RangeTime {
  min: number;
  max: number;
}

interface Gameplay {
  perspective: string;
  flow: string;
  genre: string;
}

interface GamesOptions {
  userId: number;
  platform: string;
  sortCategory: string;
  rangeCategory: string;
  rangeTime: RangeTime;
  gameplay: Gameplay;
  modifier: string;
}

interface UsersOptions {
  sortCategory: string;
}

interface SearchOptions {
  games: GamesOptions;
  users: UsersOptions;
  filter: string;
  sort: number;
  randomizer: number;
}

export interface SearchPayload {
  searchType: string;
  searchTerms: string[];
  searchPage: number;
  size: number;
  searchOptions: SearchOptions;
}
