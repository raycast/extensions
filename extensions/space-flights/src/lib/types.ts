export interface Launch {
  id: string;
  name: string;
  status: {
    id: number;
    name: string;
    abbrev: string;
    description: string;
  };
  net: string; // Launch date and time
  window_start: string;
  window_end: string;
  mission?: {
    id: number;
    name: string;
    description: string;
    orbit?: {
      name: string;
      abbrev: string;
    };
  };
  pad: {
    id: number;
    name: string;
    location: {
      id: number;
      name: string;
      country_code: string;
    };
  };
  rocket: {
    id: number;
    name: string;
    configuration: {
      id: number;
      name: string;
      family: string;
      full_name: string;
      variant: string;
    };
  };
  image?: string;
  webcast_live?: boolean;
  vidURLs?: string[];
  url?: string;
}

// Extended launch details interface with additional properties from detailed API
export interface LaunchDetail extends Launch {
  info_urls?: {
    url: string;
    title: string;
    description?: string;
    feature_image?: string;
  }[];
  program?: {
    id: number;
    name: string;
    description?: string;
  }[];
  updates?: {
    id: number;
    comment: string;
    created_on: string;
  }[];
  infographic?: string;
  agency?: {
    id: number;
    name: string;
    type: string;
  };
}

export interface LaunchesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Launch[];
}

export interface ThrottleItem {
  your_request_limit: number;
  limit_frequency_secs: number;
  current_use: number;
  next_use_secs: number;
  ident: string;
}

// API can return either an array of throttle items or a single object
export type ApiThrottleResponse = ThrottleItem[] | ThrottleItem;
