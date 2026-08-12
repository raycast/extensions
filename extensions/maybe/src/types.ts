export type Account = {
  id: string;
  name: string;
  balance: string;
  currency: string;
  classification: string;
  account_type: string;
};
type Category = {
  id: string;
  name: string;
  classification: string;
  color: string;
  icon: string;
};
export type Transaction = {
  id: string;
  date: string;
  amount: string;
  currency: string;
  name: string;
  notes: string;
  classification: string;
  account: Pick<Account, "id" | "name" | "account_type">;
  category: Category | null;
  created_at: string;
  updated_at: string;
};
export type PaginationInfo = {
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
};

export type TransactionCreateRequest = {
  description: string;
  account_id: string;
  amount: string;
  currency: string;
  date: Date | null;
  notes: string;
};

export type ErrorResult = { status: number; error: string } | { error: string; message: string; errors?: string[] };
