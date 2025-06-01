export type Currency = {
  code: string;
  symbol: string;
  name: string;
  plural: string;
  exponent: number;
};
export type Money = {
  value: string;
  currency: Currency;
};

export type Business = {
  id: string;
  name: string;
  isPersonal: boolean;
  modifiedAt: string;
  currency: {
    code: string;
  };
};

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  OVERDUE = "OVERDUE",
  OVERPAID = "OVERPAID",
  PAID = "PAID",
  PARTIAL = "PARTIAL",
  SAVED = "SAVED",
  SENT = "SENT",
  UNPAID = "UNPAID",
  VIEWED = "VIEWED",
}

export type Invoice = {
  id: string;
  createdAt: string;
  modifiedAt: string;
  pdfUrl: string;
  viewUrl: string;
  status: InvoiceStatus;
  title: string;
  subhead: string;
  invoiceNumber: string;
  invoiceDate: string;
  itemTitle: string;
  unitTitle: string;
  priceTitle: string;
  amountTitle: string;
  customer: {
    name: string;
  };
  dueDate: string;
  amountDue: Money;
  amountPaid: Money;
  total: {
    value: string;
    currency: {
      symbol: string;
    };
  };
  items: Array<{
    product: {
      id: string;
      name: string;
    };
    quantity: string;
    price: string;
    subtotal: {
      value: string;
      currency: {
        symbol: string;
      };
    };
  }>;
};

export type Customer = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  currency: {
    code: string;
    name: string;
    symbol: string;
  } | null;
  createdAt: string;
  modifiedAt: string;
  overdueAmount: {
    raw: number;
    value: number;
  };
  outstandingAmount: {
    raw: number;
    value: string;
  };
};

export type Result<T> =
  | {
      errors: Array<{
        extensions: {
          id: string;
          code: string;
        };
        message: string;
        locations: Array<{
          line: number;
          column: number;
        }>;
        path: string[];
      }>;
      data?: null | T;
    }
  | {
      data: T;
    };

export type Edges<T> = {
  edges: Array<{
    node: T;
  }>;
};
