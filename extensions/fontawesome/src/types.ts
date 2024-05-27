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
interface SearchItem {
  id: string;
  label: string;
  svgs: SvgsItem[];
  unicode: string;
}
interface SvgsItem {
  height: number;
  html: string;
  iconDefinition: IconDefinition;
  pathData: string[];
  width: number;
}
interface IconDefinition {
  prefix: string;
  icon: any[];
  iconName: string;
}
