import { BankAccount } from "../types/bank-account";
import { Transaction } from "../types/transaction";

export type TransactionKeys = keyof Transaction;

export type TransactionId = Extract<TransactionKeys, "id" | "transaction_id">;
export type TransactionEndedAmount = Extract<TransactionKeys, "amount" | "amount_cents" | "currency">;
export type TransactionLocalAmout = Extract<TransactionKeys, "local_amount" | "local_amount_cents" | "local_currency">;
export type TransactionVATAmount = Extract<TransactionKeys, "vat_amount" | "vat_amount_cents" | "vat_rate">;
// prettier-ignore
export type TransactionSample = Pick<
  Transaction,
  | "label" 
  | "category" 
  | "side" 
  | TransactionEndedAmount 
  | TransactionLocalAmout 
  | TransactionVATAmount
>;

// ==========
// Some example of transactions
// ==========

export function fakeTransaction(
  side: "debit" | "credit",
  label: string,
  category: string,
  amount: number,
  local_amount?: number,
  vat_amount?: number
): TransactionSample {
  return {
    label,
    category,
    side,
    amount: amount,
    amount_cents: amount * 100,
    currency: "EUR",
    local_amount: local_amount ? local_amount : amount,
    local_amount_cents: local_amount ? local_amount * 100 : amount * 100,
    local_currency: "EUR",
    vat_amount: vat_amount ? vat_amount : 0.0,
    vat_amount_cents: vat_amount ? vat_amount * 100 : 0,
    vat_rate: vat_amount ? 20.0 : 0.0,
  };
}

// prettier-ignore
export const transaction: Record<string, TransactionSample> = {
  "1PASSWORD": fakeTransaction("debit", "1PASSWORD", "online_service", 16.7),
  ALAN: fakeTransaction("debit", "Alan", "other_expense", 67.82, 67.82, 13.56), 
  PAYFIT: fakeTransaction("debit", "PayFit", "other_expense", 99.0, 99.0, 19.8),
  NOTION: fakeTransaction("debit", "Notion", "online_service", 72.00),
  LINEAR: fakeTransaction("debit", "Linear", "online_service", 48.00),
  GITHUB: fakeTransaction("debit", "GitHub", "online_service", 12.33),
  MAKERSIDE: fakeTransaction("debit", "Makerside", "online_service", 49.0, 49.0, 9.8),
  INCOME_STRIPE: fakeTransaction("credit", "Stripe", "online_service", 83333),
  SALARY_CHRIS: fakeTransaction("debit", "Christophe Ribeiro", "transfert", 4200),
  SALARY_PIERRE: fakeTransaction("debit", "Pierre Ribeiro", "transfert", 4200),
  SALARY_ARNAUD: fakeTransaction("debit", "Arnaud Musk", "transfert", 4200),  
};

// ==========
// Helpers to compute a transaction history with a computed balance
// ==========

export type TransactionSampleBalanced = TransactionSample & {
  settled_balance: number;
  settled_balance_cents: number;
};

/**
 * Build a transaction history with a computed balance
 *
 * /!\ the first element store the initial balance with no transaction data.
 */
export const buildTransactionHistoryWithBalance = (bankAccount: BankAccount, transactions: TransactionSample[]) =>
  transactions.reduce(
    (acc, transaction, index) => {
      acc.push(
        transaction.side === "debit"
          ? {
              ...transaction,
              settled_balance: acc[index].settled_balance - transaction.amount,
              settled_balance_cents: acc[index].settled_balance_cents - transaction.amount_cents,
            }
          : {
              ...transaction,
              settled_balance: acc[index].settled_balance + transaction.amount,
              settled_balance_cents: acc[index].settled_balance_cents + transaction.amount_cents,
            }
      );
      return acc;
    },
    [
      {
        settled_balance: bankAccount.balance,
        settled_balance_cents: bankAccount.balance_cents,
      },
    ] as TransactionSampleBalanced[]
  );
