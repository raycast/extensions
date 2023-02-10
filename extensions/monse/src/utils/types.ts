export type Transaction = {
  id: number;
  bank_account_id: number;
  status: "pending" | "booked";
  type: "expense" | "income";
  concept: string;
  notes: string | null;
  amount: number;
  currency: string;
  booked_at: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: null | Date;
  category: Category;
  bank_account: {
    name: string;
    bank: {
      logo: string;
      name: string;
    };
  };
};

export interface Category {
  id: number;
  parent_id: null;
  type: string;
  level: number;
  accountable: number;
  slug: string;
  icon: string;
  name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

export type Currency = "EUR" | "USD" | "GBP";
export type Locale = "es-ES" | "en-US" | "en-GB";
