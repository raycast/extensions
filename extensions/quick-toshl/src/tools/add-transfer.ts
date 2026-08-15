import { toshl } from "../utils/toshl";
import { parseAmount, formatDisplayAmount, AI_INSTRUCTIONS } from "../utils/helpers";
import { format } from "date-fns";

type Input = {
  amount: string;
  fromAccountId: string;
  toAccountId: string;
  description?: string;
  currency?: string;
  date?: string;
};

export default async function addTransfer(input: Input) {
  const apiDefaultCurrency = await toshl.getDefaultCurrency();
  const currency = input.currency || apiDefaultCurrency;
  const parsed = parseAmount(input.amount);
  const dateStr = input.date || format(new Date(), "yyyy-MM-dd");

  if (input.fromAccountId.trim() === input.toAccountId.trim()) {
    return {
      success: false,
      message: "From and to accounts must differ.",
      _instructions: AI_INSTRUCTIONS,
    };
  }

  await toshl.addTransfer({
    amount: -Math.abs(parsed),
    currency: { code: currency },
    date: dateStr,
    desc: input.description,
    account: input.fromAccountId,
    transaction: {
      account: input.toAccountId,
      currency: { code: currency },
    },
  });

  return {
    success: true,
    message: `Transfer ${formatDisplayAmount(parsed, currency)} recorded.`,
    _instructions: AI_INSTRUCTIONS,
  };
}
