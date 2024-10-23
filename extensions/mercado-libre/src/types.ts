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
  available_quantity: number;
  condition: string;
  attributes: Attribute[];
  shipping: {
    free_shipping: boolean;
  };
  installments: {
    quantity: number;
    amount: number;
    rate: number;
    currency_id: string;
  };
}

export interface Attribute {
  id: string;
  name: string;
  value_id: string;
  value_name: string;
  value_struct: null | ValueStruct;
  attribute_group_id: string;
  attribute_group_name: string;
  source: number;
}

export interface ValueStruct {
  number: number;
  unit: string;
}

export interface Preferences {
  siteId: string;
  viewLayout: string;
  gridItemSize: number;
}
