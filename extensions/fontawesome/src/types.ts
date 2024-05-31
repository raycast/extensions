export type IconStyle = 'brands' | 'duotone' | 'light' | 'regular' | 'sharp-solid' | 'solid' | 'thin';

interface Style {
  style: IconStyle;
}

export interface Icon {
  id: string;
  unicode: string;
  label: string;
  familyStylesByLicense: {
    free: Style[];
  };
}

export interface ApiResponse {
  data: {
    release: {
      icons: Icon[];
    };
  };
}

export interface Preferences {
  iconStyle: IconStyle;
}

// Search results types

export interface SearchResults {
  data: {
    search: Icon[];
  };
}

//----

export interface SearchResult {
  data: Data;
}
interface Data {
  search: SearchItem[];
}
export interface SearchItem {
  id: string;
  label: string;
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
