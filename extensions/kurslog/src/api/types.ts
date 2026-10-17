export interface Tag {
  id: number;
  name_uk: string;
  name_ru: string;
  name_en: string;
  sort_in_from_list?: number;
  sort_in_to_list?: number;
  popularity?: number;
  sort_order?: number;
}

export interface PopularDirection {
  id: number;
  from_currency: string;
  to_currency: string;
  from_name_uk: string;
  from_name_ru: string;
  from_name_en: string;
  to_name_uk: string;
  to_name_ru: string;
  to_name_en: string;
  from_currency_name: string;
  to_currency_name: string;
  from_icon_img: string;
  to_icon_img: string;
  rate_in: number;
  rate_out: number;
  exchanger_count?: number;
  from_tags: Tag[];
  to_tags: Tag[];
}

export interface RateItem {
  id: number;
  direction_id: number;
  rate_in: number;
  rate_out: number;
  reserves: number | null;
  min_amount: number | null;
  max_amount: number | null;
  from_currency: string;
  to_currency: string;
  from_currency_name: string;
  to_currency_name: string;
  from_currency_decimals: number;
  to_currency_decimals: number;
  exchanger_id: number;
  exchanger_name: string;
  exchanger_rating: number | null;
  exchanger_internal_url: string;
  exchanger_trust_score_total: number | null;
  trust_status_name?: string;
  trust_status_label?: string;
  trust_status_color?: string;
  trust_status_css_class?: string;
  trust_status_icon_path?: string;
  trust_status_explanation?: string;
  params?: string;
  floating?: boolean;
  city_url?: string;
}

export interface ExchangerRatesResponse {
  exchanger_id: number;
  exchanger_name: string;
  exchanger_rating: number | null;
  exchanger_internal_url: string;
  exchanger_trust_score_total: number | null;
  trust_status_name?: string;
  trust_status_label?: string;
  trust_status_color?: string;
  trust_status_css_class?: string;
  trust_status_icon_path?: string;
  trust_status_explanation?: string;
  rates: {
    id: number;
    direction_id: number;
    rate_in: number;
    rate_out: number;
    reserves: number | null;
    min_amount: number | null;
    max_amount: number | null;
    from_currency: string;
    to_currency: string;
    from_currency_name: string;
    to_currency_name: string;
    from_currency_decimals: number;
    to_currency_decimals: number;
    params?: string;
    floating?: boolean;
  }[];
}

export interface TopRatesResponse {
  rates: RateItem[];
}

export interface Currency {
  id: number;
  url: string;
  currency_name: string;
  name_uk: string;
  name_ru: string;
  name_en: string;
  icon_img: string;
  popularity_from: number;
  popularity_to: number;
  tags: Tag[];
  has_rates: boolean;
}

export interface CurrencyPair {
  from: string;
  to: string;
}

export interface Exchanger {
  id: number;
  name: string;
  internal_url: string;
  status: string;
  average_rating: number;
  trust_score_total: number | null;
  pairs_count: number;
  review_count: number;
  problem_count: number;
  trust_status_name?: string;
  trust_status_label?: string;
  trust_status_color?: string;
  trust_status_css_class?: string;
  trust_status_icon_path?: string;
  trust_status_explanation?: string;
  monitoring_reviews_count?: number;
}

export interface BatchRatesRequest {
  directions: { from: string; to: string }[];
}

export interface BatchRateItem {
  from_currency: string;
  to_currency: string;
  rate_in: number;
  rate_out: number;
  exchanger_count: number;
  from_icon_img?: string;
  to_icon_img?: string;
  from_name_uk?: string;
  from_name_ru?: string;
  from_name_en?: string;
  to_name_uk?: string;
  to_name_ru?: string;
  to_name_en?: string;
}
