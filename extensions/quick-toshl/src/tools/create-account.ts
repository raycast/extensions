import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  name: string;
  currencyCode?: string;
  initialBalance?: string;
  type?: string;
};

export default async function createAccount(input: Input) {
  const main = await toshl.getDefaultCurrency();
  const bal = input.initialBalance ? parseFloat(input.initialBalance) : 0;
  const a = await toshl.createAccount({
    name: input.name.trim(),
    currency: { code: input.currencyCode || main },
    type: input.type || "custom",
    initial_balance: isNaN(bal) ? 0 : bal,
  });
  return {
    success: true,
    accountId: a.id,
    name: a.name,
    _instructions: AI_INSTRUCTIONS,
  };
}
