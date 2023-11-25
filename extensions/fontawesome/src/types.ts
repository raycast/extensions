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
