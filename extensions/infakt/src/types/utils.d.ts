import { useFetch } from "@raycast/utils";

import { currencies, locales, paymentMethods, printTypes } from "@/utils";

export type PaymentMethod = (typeof paymentMethods)[number]["name"];

export type PrintType = (typeof printTypes)[number]["value"];

export type Locale = (typeof locales)[number]["value"];

export type BusinessActivityKind = "private_person" | "self_employed" | "other_business";

export type SaleType = "service" | "merchandise";

export type InvoiceDateKind = "sale_date" | "service_date" | "cargo_date" | "continuous_date_end_on";

export type VatExchangeDateKind = "vat" | "pit";

export type FlatRateTaxSymbol = "2" | "3" | "5.5" | "8.5" | "17" | "20";

type Currency = (typeof currencies)[number]["value"];

export type Preferences = {
  currency: Currency;
};

export type Metainfo = {
  count: number;
  total_count: number;
  next: string;
  previous: string;
};

type Modifier = "eq" | "cont" | "lt" | "gt" | "lteq" | "gteq";

type Query = `q[${string}_${Modifier}]`;

type OrderDirection = "ASC" | "DESC";

type Order<OrderObject> = `${keyof OrderObject} ${OrderDirection}`;

export type Filters<FilterObject> = {
  [query: Query]: string | number | boolean;
  limit: number;
  offset: number;
  order?: Order<FilterObject>;
};

export type ApiPaginatedResponse<T> = {
  metainfo: Metainfo;
  entities: T;
};

export type ApiErrorResponse = {
  error: string;
  errors?: {
    [key: string]: string[];
  };
};

export type UseFetchOptions<T> = Parameters<typeof useFetch<T>>[1];
