import { Currency } from "@/types/utils";

export type BankAccountObject = {
  id: number;
  bank_name: string;
  account_number: string;
  swift: string;
  default: boolean;
  currency: Currency | null;
  custom_name: string | null;
};
