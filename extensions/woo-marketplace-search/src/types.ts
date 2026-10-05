// Multilingual field type (WooCommerce uses localized fields)
export type LocalizedField = Record<string, string> | string;

// WooCommerce Extension/Product type from Algolia
export interface WooProduct {
  objectID: string;
  id?: number;
  title: LocalizedField;
  excerpt?: LocalizedField;
  permalink: LocalizedField;
  image?: string;
  image_app_icon?: string;
  price?: number;
  regular_price?: number;
  sale_price?: number;
  rating?: number;
  review_count?: number;

  // Vendor info
  vendor_id?: number;
  vendor_name?: string;
  vendor_slug?: string;

  // Product type
  is_extension?: boolean;
  is_theme?: boolean;
  is_business_service?: boolean;
  productCategory?: string;

  // Other
  slug?: string;
  tags_list?: string[];
  _highlightResult?: {
    title?: {
      value: string;
      matchLevel: string;
    };
  };
}

// WooCommerce Documentation/Post type from Algolia
export interface WooDoc {
  objectID: string;
  id?: number;
  title: string;
  body?: string;
  permalink?: string;
  url?: string;
  categories?: string[];
  _highlightResult?: {
    title?: {
      value: string;
      matchLevel: string;
    };
  };
}

// Algolia search response
export interface AlgoliaResponse<T> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  query: string;
}

// Algolia multi-index response
export interface AlgoliaMultiResponse<T> {
  results: AlgoliaResponse<T>[];
}
