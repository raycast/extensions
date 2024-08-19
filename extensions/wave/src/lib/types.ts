export type Business = {
  id: string;
  name: string;
  isPersonal: boolean;
  modifiedAt: string;
  currency: {
    code: string;
  };
};

export type InvoiceStatus =
  | "DRAFT"
  | "OVERDUE"
  | "OVERPAID"
  | "PAID"
  | "PARTIAL"
  | "SAVED"
  | "SENT"
  | "UNPAID"
  | "VIEWED";
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
