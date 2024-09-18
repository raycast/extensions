import { FlatRateTaxSymbol } from "@/types/utils";

export type ProductObject = {
  id: number;
  name: string;
  symbol?: string | null;
  pkwiu?: string | null;
  cn?: string | null;
  pkob?: string | null;
  unit?: string | null;
  tax_symbol?: string | null;
  quantity?: number | null;
  net_price?: number | null;
  tax_price?: number | null;
  gross_price?: number | null;
  unit_net_price?: number | null;
  purchase_unit_net_price?: number | null;
  purchase_unit_gross_price?: number | null;
  flat_rate_tax_symbol?: FlatRateTaxSymbol | null;
  discount?: string | null;
  unit_net_price_before_discount?: number | null;
  gtu_id?: number | null;
};

export type CreateProductFormValues = {
  name: string;
  unit: string;
  tax_symbol: string;
  net_price: string;
  quantity: string;
};

export type CreateProductPayload = {
  product: Omit<CreateProductFormValues, "net_price"> & {
    gross_price: number;
    tax_price: number;
    net_price: number;
    unit_net_price: number;
  };
};

export type UpdateProductFormValues = Partial<CreateProductFormValues>;

export type UpdateProductPayload = {
  product: Partial<CreateProductPayload["product"]>;
};
