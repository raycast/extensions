import { getApiClient } from "../lib/accounts";
import { generateIdempotencyKey, formatCurrency } from "../lib/utils";

type Input = {
  accountId: string;
  recipientId: string;
  amount: number;
  paymentMethod: "ach" | "check" | "domesticWire" | "internationalWire";
  memo?: string;
};

export default async function SendPayment(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };

  try {
    const transaction = await api.sendPayment(input.accountId, {
      recipientId: input.recipientId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      idempotencyKey: generateIdempotencyKey(),
      memo: input.memo,
    });

    return {
      success: true,
      transactionId: transaction.id,
      amount: formatCurrency(input.amount),
      status: transaction.status,
      counterpartyName: transaction.counterpartyName,
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
    `Send ${formatCurrency(input.amount)} via ${input.paymentMethod.toUpperCase()} to recipient ${input.recipientId}?`,
};