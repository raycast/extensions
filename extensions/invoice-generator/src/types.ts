export type InvoiceFormStaticValues = {
  [key: string]: string | undefined | Date | null;
  number?: string;
  from: string;
  address?: string;
  to?: string;
  date: Date | null;
  currency?: string;
  shipping?: string;
  taxType?: string;
  tax?: string;
  amount_paid?: string;
  notes?: string;
};

export type InvoiceItemKeys = {
  [key: `name-${number}`]: string;
  [key: `quantity-${number}`]: string;
  [key: `unit_cost-${number}`]: string;
};

export type InvoiceFormValues = InvoiceFormStaticValues & InvoiceItemKeys;

export type InvoiceFormItemValues = {
  name?: string;
  quantity?: string;
  unit_cost?: string;
}[];

export type InvoiceContent = InvoiceFormStaticValues & { items: InvoiceFormItemValues };

export type InvoiceRequestItemValues = {
  name: string;
  quantity: number;
  unit_cost: number;
};

export type InvoiceRequestContent = {
  logo?: string;
  number: string;
  from: string;
  to: string;
  date: string;
  currency?: string;
  amount_paid?: number;
  tax?: number;
  notes?: string;
  items: InvoiceRequestItemValues[];
};
