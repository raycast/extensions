export interface ScryfallResponse {
  object: string;
  total_cards: number;
  has_more: boolean;
  data: ScryfallCard[];
}

export interface ScryfallCard {
  object: string;
  id: string;
  oracle_id: string;
  multiverse_ids: number[];
  mtgo_id?: number;
  tcgplayer_id?: number;
  cardmarket_id?: number;
  name: string;
  lang: string;
  released_at: string;
  uri: string;
  scryfall_uri: string;
  layout: string;
  highres_image: boolean;
  image_status: string;
  image_uris: ImageUris;
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text: string;
  power: string;
  toughness: string;
  colors: string[];
  color_identity: string[];
  keywords: string[];
  all_parts?: AllPart[];
  legalities: Legalities;
  games: Game[];
  reserved: boolean;
  game_changer: boolean;
  foil: boolean;
  nonfoil: boolean;
  finishes: string[];
  oversized: boolean;
  promo: boolean;
  reprint: boolean;
  variation: boolean;
  set_id: string;
  set: string;
  set_name: string;
  set_type: string;
  set_uri: string;
  set_search_uri: string;
  scryfall_set_uri: string;
  rulings_uri: string;
  prints_search_uri: string;
  collector_number: string;
  digital: boolean;
  rarity: Rarity;
  card_back_id: string;
  artist: string;
  artist_ids: string[];
  illustration_id: string;
  border_color: string;
  frame: string;
  frame_effects: string[];
  security_stamp: string;
  full_art: boolean;
  textless: boolean;
  booster: boolean;
  story_spotlight: boolean;
  edhrec_rank?: number;
  penny_rank?: number;
  prices: Record<string, string | null>;
  related_uris: RelatedUris;
  purchase_uris?: PurchaseUris;
  flavor_text?: string;
  arena_id?: number;
  watermark?: string;
  card_faces?: CardFace[];
}

export interface AllPart {
  object: string;
  id: string;
  component: string;
  name: string;
  type_line: string;
  uri: string;
}

export enum Game {
  Arena = "arena",
  Mtgo = "mtgo",
  Paper = "paper",
}

export interface ImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export enum Rarity {
  Common = "common",
  Uncommon = "uncommon",
  Rare = "rare",
  Mythic = "mythic",
  Special = "special",
  Bonus = "bonus",
  Basic = "basic",
}

export enum Legality {
  Legal = "legal",
  NotLegal = "not_legal",
  Banned = "banned",
  Restricted = "restricted",
}

export interface Legalities {
  standard: Legality;
  future: Legality;
  historic: Legality;
  timeless: Legality;
  gladiator: Legality;
  pioneer: Legality;
  explorer: Legality;
  modern: Legality;
  legacy: Legality;
  pauper: Legality;
  vintage: Legality;
  penny: Legality;
  commander: Legality;
  oathbreaker: Legality;
  standardbrawl: Legality;
  brawl: Legality;
  alchemy: Legality;
  paupercommander: Legality;
  duel: Legality;
  oldschool: Legality;
  premodern: Legality;
  predh: Legality;
}

export interface PurchaseUris {
  tcgplayer: string;
  cardmarket: string;
  cardhoarder: string;
}

export interface RelatedUris {
  gatherer?: string;
  tcgplayer_infinite_articles: string;
  tcgplayer_infinite_decks: string;
  edhrec: string;
}

export interface ScryfallSet {
  object: string;
  id: string;
  code: string;
  name: string;
  uri: string;
  scryfall_uri: string;
  search_uri: string;
  released_at: string;
  set_type: string;
  card_count: number;
  digital: boolean;
  icon_svg_uri: string;
}

export interface CardFace {
  object: string;
  name: string;
  mana_cost: string;
  type_line: string;
  oracle_text: string;
  colors: string[];
  power: string;
  toughness: string;
  artist: string;
  artist_id: string;
  illustration_id: string;
  image_uris: ImageUris;
  color_indicator?: string[];
  flavor_text?: string;
}
