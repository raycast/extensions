export interface SearchResult {
  data: Data;
}
interface Data {
  search: SearchItem[];
}
export interface SearchItem {
  id: string;
  svgs: SvgsItem[];
  unicode: string;
}
interface SvgsItem {
  html: string;
  familyStyle: {
    prefix: string;
  };
}

export interface TokenData {
  access_token: string;
  expires_in: number;
  scopes: string[];
  token_type: string;
}
