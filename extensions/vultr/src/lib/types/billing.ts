export type BillingHistory = {
  id: number;
  date: string;
  type: string;
  description: string;
  amount: number;
  balance: number;
};

export type InvoiceItem = {
  description: string;
  product: string;
  start_date: string;
  end_date: string;
  units: number;
  unit_type: string;
  unit_price: number;
  total: number;
};
