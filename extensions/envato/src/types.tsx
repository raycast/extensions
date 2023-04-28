export interface envatoErrors {
  empty?: boolean;
  reason?: string;
  description?: string;
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
  icon_with_landscape_preview?: string;
}
