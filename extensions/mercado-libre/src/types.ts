export interface MercadoLibreResponse {
  paging: Paging;
  results: MercadoLibreItem[];
}

export interface Paging {
  total: number;
  primary_results: number;
  offset: number;
  limit: number;
}

export interface MercadoLibreItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  permalink: string;
  thumbnail: string;
}

export interface Preferences {
  siteId: string;
  viewLayout: string;
  gridItemSize: number;
}
