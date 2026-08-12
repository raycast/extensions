import { updateTransactionDetails } from "../lib/moneytree";
import { Transaction } from "../lib/types";

type Input = {
  /**
   * Moneytree transaction id from search-transactions.
   */
  transactionId: number;
  /**
   * Original transaction date from search-transactions.
   */
  date: string;
  /**
   * Original signed transaction amount from search-transactions.
   */
  amount: number;
  /**
   * New Moneytree category id. Use get-categories first to find the id.
   */
  categoryId: number;
  /**
   * Original Moneytree expense type from search-transactions.
   */
  expenseType: number;
  /**
   * New user description. Omit or use an empty string to clear the custom description.
   */
  descriptionGuest?: string;
  /**
   * Original Moneytree claim id from search-transactions. Omit when search-transactions returned null.
   */
  claimId?: number;
};

/**
 * Update a Moneytree transaction's custom description and/or category. This mutates Moneytree data.
 */
export default async function tool(input: Input) {
  if (!input.transactionId) {
    throw new Error("transactionId is required");
  }
  if (!input.date) {
    throw new Error("date is required; use search-transactions first and pass the original date");
  }
  if (typeof input.amount !== "number") {
    throw new Error("amount is required; use search-transactions first and pass the original amount");
  }
  if (!input.categoryId) {
    throw new Error("categoryId is required; use get-categories first to find the category id");
  }
  if (typeof input.expenseType !== "number") {
    throw new Error("expenseType is required; use search-transactions first and pass the original expenseType");
  }

  const transaction = await updateTransactionDetails({
    transaction: {
      id: input.transactionId,
      date: input.date,
      amount: input.amount,
      category_id: input.categoryId,
      description_guest: input.descriptionGuest ?? null,
      description_pretty: "",
      description_raw: "",
      raw_transaction_id: 0,
      created_at: "",
      updated_at: "",
      expense_type: input.expenseType,
      predicted_expense_type: input.expenseType,
      account_id: 0,
      claim_id: input.claimId || null,
      attachments: [],
      receipts: [],
      attributes: {},
    } satisfies Transaction,
    descriptionGuest: input.descriptionGuest?.trim() || null,
    categoryId: input.categoryId,
  });

  return {
    transaction: {
      id: transaction.id,
      date: transaction.date,
      amount: transaction.amount,
      descriptionGuest: transaction.description_guest,
      descriptionPretty: transaction.description_pretty,
      rawDescription: transaction.description_raw,
      categoryId: transaction.category_id,
      expenseType: transaction.expense_type,
      updatedAt: transaction.updated_at,
    },
  };
}
