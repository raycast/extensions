export interface Root {
  products: Product[];
}

export interface SingleProductRoot {
  product: Product;
}

export interface Product {
  id?: number;
  title?: string;
  handle?: string;
  body_html?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  vendor?: string;
  product_type?: string;
  /**
   * Tags can be returned by Shopify as either a single comma-separated string
   * or an array of strings depending on the storefront and API surface.
   *
   * Consumers should NOT assume a single shape. Use `normalizeTags()`
   * from `./services/product-mapper` to obtain a reliable `string[]`.
   */
  tags?: string | string[];
  variants?: Variant[];
  images?: Image[];
  options?: Option[];
}

export interface Variant {
  id: number;
  title: string;
  option1: string;
  option2: unknown;
  option3: unknown;
  sku?: string;
  requires_shipping: boolean;
  taxable: boolean;
  featured_image: unknown;
  available: boolean;
  price: string;
  price_currency?: string;
  grams: number;
  compare_at_price: unknown;
  position: number;
  product_id: number;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: number;
  created_at: string;
  position: number;
  updated_at: string;
  product_id: number;
  variant_ids: unknown[];
  src: string;
  width: number;
  height: number;
}

export interface Option {
  name: string;
  position: number;
  values: string[];
}

export interface ProductJsRoot {
  id: number;
  title: string;
  handle: string;
  description: string;
  published_at: string;
  created_at: string;
  vendor: string;
  type: string;
  tags: string[];
  price: number;
  price_min: number;
  price_max: number;
  available: boolean;
  price_varies: boolean;
  compare_at_price: number | null;
  compare_at_price_min: number;
  compare_at_price_max: number;
  compare_at_price_varies: boolean;
  variants: ProductJsVariant[];
  images: string[];
  featured_image: string;
  options: Option[];
  url: string;
  media: ProductMedia[];
  requires_selling_plan: boolean;
  selling_plan_groups: unknown[];
}

export interface ProductJsVariant {
  id: number;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  sku: string | null;
  requires_shipping: boolean;
  taxable: boolean;
  featured_image: unknown;
  available: boolean;
  name: string;
  public_title: string | null;
  options: string[];
  price: number;
  weight: number;
  compare_at_price: number | null;
  inventory_management: string;
  barcode: string | null;
  quantity_rule: {
    min: number;
    max: number | null;
    increment: number;
  };
  quantity_price_breaks: unknown[];
  requires_selling_plan: boolean;
  selling_plan_allocations: unknown[];
}

export interface ProductMedia {
  alt: string | null;
  id: number;
  position: number;
  preview_image: {
    aspect_ratio: number;
    height: number;
    width: number;
    src: string;
  };
  aspect_ratio: number;
  height: number;
  media_type: string;
  src: string;
  width: number;
}

export interface SearchSuggestRoot {
  resources: {
    results: {
      products?: SearchProduct[];
      pages?: SearchPage[];
      collections?: SearchCollection[];
      articles?: SearchArticle[];
    };
  };
}

export interface SearchProduct {
  available: boolean;
  body: string;
  compare_at_price_max: string;
  compare_at_price_min: string;
  handle: string;
  id: number;
  image: string;
  price: string;
  price_max: string;
  price_min: string;
  tags: string | string[];
  title: string;
  type: string;
  url: string;
  variants: unknown[];
  vendor: string;
  featured_image: {
    alt: string;
    aspect_ratio: number;
    height: number;
    url: string;
    width: number;
  };
}

export interface SearchPage {
  id: number;
  title: string;
  handle: string;
  body: string;
  url: string;
  author?: string;
  published_at?: string;
}

export interface SearchCollection {
  id: number;
  title: string;
  handle: string;
  body: string;
  url: string;
  image?: string;
}

export interface SearchArticle {
  id: number;
  title: string;
  handle: string;
  body: string;
  url: string;
  author?: string;
  published_at?: string;
  blog_id?: number;
  image?: string;
}

export interface RecommendationsRoot {
  products: ProductJsRoot[];
  intent: string;
}

export interface StoreMetaRoot {
  id?: number;
  name?: string;
  city?: string;
  province?: string;
  country?: string;
  currency?: string;
  domain?: string;
  url?: string;
  myshopify_domain?: string;
  description?: string;
  ships_to_countries?: string[];
  money_format?: string;
  published_collections_count?: number;
  published_products_count?: number;
  shopify_pay_enabled_card_brands?: string[];
  offers_shop_pay_installments?: boolean;
  page?: {
    pageType: string;
  };
}
