import { getApiClient } from "../lib/accounts";

type Input = {
  transactionId: string;
  note?: string;
  categoryId?: string;
};

export default async function UpdateTransaction(input: Input) {
  if (!input.note && !input.categoryId) {
    return { error: "At least one of note or categoryId must be provided" };
  }

  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };

  try {
    const transaction = await api.updateTransaction(input.transactionId, {
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    });

    return {
      success: true,
      transactionId: transaction.id,
      note: transaction.note,
      category: transaction.mercuryCategory,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}

export const confirmation = {
  message: (input: Input) => {
    const changes = [];
    if (input.note) changes.push(`note to "${input.note}"`);
    if (input.categoryId) changes.push(`category to ${input.categoryId}`);
    return changes.length > 0
      ? `Update transaction ${input.transactionId}: set ${changes.join(" and ")}?`
      : `Update transaction ${input.transactionId}?`;
  },
};