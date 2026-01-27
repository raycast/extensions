export interface SearchResult {
  data: SearchData;
}

interface SearchData {
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

// Kits metadata returned from the Font Awesome GraphQL API
export interface Kit {
  id: string;
  name: string;
  token: string;
}

export interface KitsResult {
  data: {
    me: {
      kits: Kit[];
    };
  };
}

// Icon uploads that belong to a specific kit
export interface KitIconUpload {
  name: string;
  id?: string;
  unicode?: string;
  width: number;
  height: number;
  version?: number;
  // The API may return either a single path string or an array of path strings
  pathData: string | string[];
}

export interface KitIconsResult {
  data: {
    me: {
      kits: {
        id: string;
        name: string;
        token: string;
        iconUploads: KitIconUpload[];
      }[];
    };
  };
}
