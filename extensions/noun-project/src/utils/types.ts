export interface IconProps {
  iconId: string;
  iconName: string;
  color?: string;
}

export type NounProjectError = {
  statusCode?: number;
  message?: string;
};

export interface IconSearchData {
  isLoading: boolean;
  status: string;
  data: {
    error: NounProjectError;
    generated_at: string;
    icons: IconItem[];
    usage_limits: {
      monthly: {
        limit: number;
        usage: number;
      };
    };
  };
}

export type Creator = {
  name: string;
  permalink: string;
  username: string;
};

export type CollectionItem = {
  creator: Creator;
  id: string;
  name: string;
  permalink: string;
};

export type IconItem = {
  attribution: string;
  collections: CollectionItem[];
  creator: Creator;
  id: string;
  license_description: string;
  permalink: string;
  tags: string[];
  term: string;
  thumbnail_url: string;
};

export type IconDownloads = {
  base64_encoded_file: string;
  content_type: string;
  usage_limits: {
    monthly: MonthlyUsage;
  };
};

export type MonthlyUsage = {
  limit: number;
  usage: number;
};
export interface IconsResponse {
  data: {
    generated_at: string;
    icons: IconItem[];
    next_page: string;
    total: number;
    usage_limits: {
      monthly: MonthlyUsage;
    };
  };
}

export interface NounProjectDownloadResponse {
  base64_encoded_file: string;
  content_type: string;
  usage_limits: {
    monthly: {
      limit: number;
      usage: number;
    };
  };
}
