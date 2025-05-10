declare module "rolimons-fixed" {
  // --- Items ---
  export interface RolimonsItemArray extends Array<string | number | boolean> {
    0: string; // name
    1: string; // acronym
    2: number; // rap
    3: number; // value
    4: number; // default_value
    5: number; // demand
    6: number; // trend
    7: number; // projected
    8: number; // hyped
    9: number; // rare
    name?: string;
    acronym?: string;
    rap?: number;
    value?: number;
    default_value?: number;
    demand?: string;
    trend?: string;
    projected?: boolean;
    hyped?: boolean;
    rare?: boolean;
  }
  export interface RolimonsItemsResponse {
    items: Record<string, RolimonsItemArray>;
  }

  // --- Players ---
  export interface RolimonsPlayer {
    id: number;
    name: string;
    rank: string;
    value: string;
    rap: string;
  }
  export type RolimonsLeaderboard = RolimonsPlayer[];

  // --- Games ---
  export interface RolimonsGame {
    name: string;
    creator_name: string;
    created: string;
    max_players: string;
    genre: string;
    players: string;
    vists: string;
    likes: string;
    dislikes: string;
    description: string;
    like_percentage: string;
    favorites: string;
    average_playtime: string;
    last_updated: string;
  }

  // --- Groups ---
  export interface RolimonsGroup {
    owner_id: number;
    owner: string;
    members: string;
    created: string;
    tracked_since: string;
    past_day_growth: string;
    last_scan: string;
  }

  // --- Trade Offers/Requests ---
  export interface TradeOfferRequest {
    items?: (number | string)[];
    tags?: string[];
    robux?: number;
  }

  // --- Activity/Trade Ads ---
  export interface RolimonsTradeAd {
    posted: string;
    userid: number;
    username: string;
    offer: TradeOfferRequest | string;
    request: TradeOfferRequest | string;
  }

  // --- Rate Limiting ---
  export interface RateLimitedResponse {
    rateLimited: true;
  }

  // --- API ---
  const rolimons: {
    items: {
      getItems(): Promise<RolimonsItemsResponse | RateLimitedResponse>;
      clear_cache(): void;
      searchItem(mode: "name" | "id", info: string): Promise<RolimonsItemArray | false | RateLimitedResponse>;
      getUAID(UAID: string, users: number): Promise<Record<string, unknown>>;
    };
    players: {
      getPlayer(userID: string | number): Promise<RolimonsPlayer | RateLimitedResponse | Record<string, never>>;
      getLeaderboard(page: number): Promise<RolimonsLeaderboard | RateLimitedResponse | []>;
    };
    games: {
      getInfo(gameID: string | number): Promise<RolimonsGame | RateLimitedResponse | Record<string, never>>;
    };
    groups: {
      getInfo(groupID: string | number): Promise<RolimonsGroup | RateLimitedResponse | Record<string, never>>;
    };
    activity: {
      getTradeAds(): Promise<RolimonsTradeAd[] | RateLimitedResponse | []>;
    };
  };
  export default rolimons;
}
