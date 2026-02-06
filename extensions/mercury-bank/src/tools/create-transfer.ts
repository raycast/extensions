import { getApiClient } from "../lib/accounts";
import { generateIdempotencyKey, formatCurrency } from "../lib/utils";

type Input = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  memo?: string;
};

export default async function CreateTransfer(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };

  try {
    const transaction = await api.createTransfer({
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      idempotencyKey: generateIdempotencyKey(),
      memo: input.memo,
    });

    return {
      success: true,
      transactionId: transaction.id,
      amount: formatCurrency(input.amount),
      status: transaction.status,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}

export const confirmation = {
  message: (input: Input) =>
    `Transfer ${formatCurrency(input.amount)} from account ${input.fromAccountId} to account ${input.toAccountId}?`,
};