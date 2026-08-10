import { toshl } from "../utils/toshl";
import { parseAmount, AI_INSTRUCTIONS } from "../utils/helpers";
import { isTransferEntry } from "../utils/toshl-model";
import type { TransferInput } from "../utils/types";

type Input = {
  entryId: string;
  fromAccountId: string;
  toAccountId: string;
  amount?: string;
  date?: string;
  description?: string;
  currencyCode?: string;
  /** For repeating transfers. */
  updateMode?: "one" | "tail" | "all";
};

export default async function updateTransfer(input: Input) {
  if (input.fromAccountId.trim() === input.toAccountId.trim()) {
    return {
      success: false,
      message: "From and to accounts must differ.",
      _instructions: AI_INSTRUCTIONS,
    };
  }

  const entry = await toshl.getEntry(input.entryId);
  if (!isTransferEntry(entry)) {
    return {
      success: false,
      message: "This entry is not a transfer. Use update-entry for expenses and incomes.",
      _instructions: AI_INSTRUCTIONS,
    };
  }

  const currencyMain = input.currencyCode || entry.currency.code;
  const abs =
    input.amount !== undefined && input.amount !== "" ? Math.abs(parseAmount(input.amount)) : Math.abs(entry.amount);

  const toCode = entry.transaction?.currency?.code || currencyMain;

  const payload: TransferInput = {
    amount: -Math.abs(abs),
    currency: {
      code: currencyMain,
      rate: entry.currency.rate,
      fixed: entry.currency.fixed,
    },
    date: input.date || entry.date,
    desc: input.description ?? entry.desc ?? "",
    account: input.fromAccountId,
    modified: entry.modified,
    transaction: {
      id: entry.transaction?.id,
      account: input.toAccountId,
      currency: {
        code: toCode,
        rate: entry.transaction?.currency?.rate,
        fixed: entry.transaction?.currency?.fixed,
      },
    },
  };

  if (entry.repeat) {
    payload.repeat = entry.repeat;
  }

  const mode = entry.repeat ? input.updateMode || "one" : undefined;
  await toshl.updateTransfer(entry.id, payload, mode);

  return {
    success: true,
    entryId: entry.id,
    message: "Transfer updated.",
    _instructions: AI_INSTRUCTIONS,
  };
}
