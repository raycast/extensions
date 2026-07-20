import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import type { AccountUpdateInput } from "../utils/types";

type Input = {
  accountId: string;
  name: string;
  currencyCode?: string;
  order?: string;
  limit?: string;
  initialBalance?: string;
};

export default async function updateAccount(input: Input) {
  const list = await toshl.getAccounts();
  const existing = list.find((a) => a.id === input.accountId);
  if (!existing?.modified) {
    return {
      success: false,
      message: "Account missing modified token — refresh cache in extension preferences.",
      _instructions: AI_INSTRUCTIONS,
    };
  }
  const code = input.currencyCode || existing.currency.code;
  const body: AccountUpdateInput = {
    id: input.accountId,
    name: input.name.trim(),
    modified: existing.modified,
    currency: {
      code,
      rate: existing.currency.rate,
      fixed: existing.currency.fixed,
    },
  };
  if (input.order !== undefined && input.order !== "") {
    const o = parseInt(input.order, 10);
    if (!isNaN(o)) body.order = o;
  }
  if (input.limit !== undefined && input.limit !== "") {
    const l = parseFloat(input.limit);
    if (!isNaN(l)) body.limit = l;
  }
  if (input.initialBalance !== undefined && input.initialBalance !== "") {
    const b = parseFloat(input.initialBalance);
    if (!isNaN(b)) body.initial_balance = b;
  }

  const a = await toshl.updateAccount(body);
  return {
    success: true,
    accountId: a.id,
    name: a.name,
    _instructions: AI_INSTRUCTIONS,
  };
}
