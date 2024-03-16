export interface MercadoLibreItem {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  currency_id: string;
  permalink: string;
}

export interface Preferences {
  siteId: string;
  viewLayout: string;
  gridItemSize: number;
}
