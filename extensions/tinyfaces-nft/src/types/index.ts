export type PaginatedData = { has_more: boolean; total: number; page: number; results: TokenData[] };

export type OwnerData = { address: string; avatar: string; tokens: TokenData[] };

export interface TokenData {
  atmosphere: string;
  birthday: string;
  body: string;
  color: string;
  direct_url: string;
  eye_color: string;
  face: string;
  glasses: string;
  hat: string;
  image_url: string;
  mouth: string;
  name: string;
  opensea_url: string;
  token_id: string;
}

export type SearchQueryStrings =
  | "NAME"
  | "ATMOSPHERE"
  | "BODY"
  | "COLOR"
  | "EYE_COLOR"
  | "FACE"
  | "GLASSES"
  | "HAT"
  | "MOUTH";

export type SearchFilters = SearchQueryStrings | "TOKEN_ID" | "OWNER";
