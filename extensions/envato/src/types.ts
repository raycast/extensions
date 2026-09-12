import {
  IAccountDetailsResponse,
  IBadgesResponse,
  IPrivateAccountDetailsResponse,
  ISearchItemsResponse,
  IStatementResponse,
  Item,
  Sale,
} from "envato";

export interface saleItem {
  item?: saleItemMeta;
  amount?: string;
  support_amount?: string;
  previews?: previewsItem;
  detail?: [];
  type?: string;
  name?: string;
  wordpress_theme_metadata?: wpThemeMetadata;
  sold_at?: Date;
  supported_until?: Date;
  price_cents?: number;
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

type previewsItem = Item["previews"];

export interface GetData {
  showdetail?: boolean;
  account?: IPrivateAccountDetailsResponse;
  user?: IAccountDetailsResponse;
  portfolio?: ISearchItemsResponse;
  sales?: Sale[];
  badges?: IBadgesResponse;
  statement?: IStatementResponse;
  errors?: envatoErrors;
  isLoading: boolean;
}

// export declare type PortfolioItems = Omit<saleItem, 'previews'> & {
//     previews: Omit<saleItem['previews'], 'live_site'> & {
//         live_site?: {
//             url: string;
//         };
//     };
// };

export interface envatoErrors {
  empty?: boolean;
  reason?: string;
  description?: string;
}
