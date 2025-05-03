export type InvoiceFormStaticValues = {
  [key: string]: string | undefined | Date | null;
  number?: string;
  from: string;
  address?: string;
  to?: string;
  date: Date | null;
  currency?: string;
  payment_terms?: string;
  shipping?: string;
  ship_to?: string;
  taxType?: string;
  tax?: string;
  amount_paid?: string;
  notes?: string;
  terms?: string;
  locale?: string;
};

export type InvoiceItemKeys = {
  [key: `name-${number}`]: string;
  [key: `quantity-${number}`]: string;
  [key: `unit_cost-${number}`]: string;
};

export type InvoiceCustomFieldKeys = {
  [key: `cf-name-${number}`]: string;
  [key: `cf-value-${number}`]: string;
};

export type InvoiceFormValues = InvoiceFormStaticValues & InvoiceItemKeys & InvoiceCustomFieldKeys;

export type InvoiceFormItemValues = {
  name?: string;
  quantity?: string;
  unit_cost?: string;
}[];

export type InvoiceFormCustomFieldValues = {
  name: string;
  value: string;
}[];

export type InvoiceContent = InvoiceFormStaticValues & { items: InvoiceFormItemValues } & {
  customFields: InvoiceFormCustomFieldValues;
};

export type InvoiceRequestItemValues = {
  name: string;
  quantity: number;
  unit_cost: number;
};

export type InvoiceRequestCustomFieldValues = {
  name: string;
  value: string;
}[];

export type InvoiceRequestContent = {
  logo?: string;
  number: string;
  from: string;
  to: string;
  date: string;
  currency?: string;
  payment_terms?: string;
  shipping?: number;
  shipping_to?: string;
  tax?: number;
  fields?: {
    tax: string | boolean;
  };
  amount_paid?: number;
  notes?: string;
  terms?: string;
  locale?: string;
  items: InvoiceRequestItemValues[];
  custom_fields: InvoiceRequestCustomFieldValues;
};

export type InvoiceRequestWithLocale = {
  content: InvoiceRequestContent;
  locale: string;
};
