interface Style {
  style: string;
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
