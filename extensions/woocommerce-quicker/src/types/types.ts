export interface WooStore {
  id: string;
  name: string;
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  favourite: boolean;
  local: boolean;
  formatting: {
    currency: string;
    currencySymbol: string;
    thousandSeparator: string;
    decimalSeparator: string;
    numberOfDecimals: number;
  };
}

export interface StoreFormValues {
  name: string;
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  favourite: boolean;
  local: boolean;
}

export interface StoreStatus {
  settings: {
    currency: string;
    currency_symbol: string;
    thousand_separator: string;
    decimal_separator: string;
    number_of_decimals: number;
  };
}

export interface WooOrder {
  id: number;
  status: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  currency: string;
}

export interface WooCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  avatar_url?: string;
  orders_count?: number;
  total_spent?: string;
}

export interface WooProduct {
  id: number;
  name: string;
  sku?: string;
  price?: string;
  status: "draft" | "pending" | "private" | "publish";
  stock_status?: string;
  type?: string;
  images?: Array<{
    src: string;
  }>;
  // For bundle products
  bundle_price?: {
    price: {
      min: {
        excl_tax: string;
      };
      max: {
        excl_tax: string;
      };
    };
  };
}
