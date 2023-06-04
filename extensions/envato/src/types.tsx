export interface statementUser {
  results?: any;
}

export interface statementResults {
  item?: any;
  index?: number;
}

export interface envatoUser {
  username?: string;
  sales?: string;
  image?: string;
}

export interface saleItem {
  item?: saleItemMeta;
  amount?: any;
  support_amount?: any;
  previews?: previewsItem;
  detail?: [];
  type?: string;
  name?: string;
  wordpress_theme_metadata?: wpThemeMetadata;
  sold_at?: Date;
  supported_until?: Date;
  price_cents?: any;
  license?: string;
  number_of_sales?: string;
  author_username?: string;
  author_url?: string;
  rating_count?: number;
  rating?: saleRating;
  published_at?: Date;
  updated_at?: Date;
  id?: number;
  version?: number;
  theme_name?: string;
  author_name?: string;
  description?: string;
  url?: [];
  date?: Date;
}

export interface saleItemMeta {
  wordpress_theme_metadata?: wpThemeMetadata;
  url?: [];
  name?: string;
  number_of_sales?: string;
  author_username?: string;
  author_url?: string;
  rating_count?: number;
  rating?: saleRating;
  previews?: previewsItem;
}

export interface saleRating {
  rating?: number;
  count?: number;
}

export interface wpThemeMetadata {
  theme_name?: string;
  name?: string;
  author_name?: string;
  author_username?: string;
  version?: string;
  description?: string;
}

export interface previewsItem {
  icon_with_landscape_preview?: previewsItemURL;
}

export interface previewsItemURL {
  icon_url?: string;
  landscape_url?: string;
}

export interface GetData {
  showdetail?: boolean;
  account?: [];
  user?: envatoUser;
  portfolio?: Portfolio;
  sales?: saleItem[];
  badges?: [];
  statement?: statementUser;
  errors?: envatoErrors;
  isLoading: boolean;
}

export interface Portfolio {
  matches: PortfolioItems[];
}

// export declare type PortfolioItems = Omit<saleItem, 'previews'> & {
//     previews: Omit<saleItem['previews'], 'live_site'> & {
//         live_site?: {
//             url: string;
//         };
//     };
// };

export interface PortfolioItems {
  id: number;
  name: string;
  number_of_sales: string;
}

export interface envatoErrors {
  empty?: boolean;
  reason?: string;
  description?: string;
}
