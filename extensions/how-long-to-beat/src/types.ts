interface RangeTime {
  min: null;
  max: null;
}

interface RangeYear {
  min: string;
  max: string;
}

interface Gameplay {
  perspective: string;
  flow: string;
  genre: string;
  difficulty: string;
}

interface GamesOptions {
  userId: number;
  platform: string;
  sortCategory: string;
  rangeCategory: string;
  rangeTime: RangeTime;
  rangeYear: RangeYear;
  gameplay: Gameplay;
  modifier: string;
}

interface ListsOptions {
  sortCategory: string;
}

interface UsersOptions {
  sortCategory: string;
}

interface SearchOptions {
  games: GamesOptions;
  lists: ListsOptions;
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

export interface GameSearchResult {
  game_id: number;
  game_name: string;
  game_image: string;
  profile_platform?: string;
  comp_main: number;
  comp_plus: number;
  comp_100: number;
}

export interface SearchResponse {
  data: GameSearchResult[];
}
