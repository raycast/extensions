import { toshl } from "../utils/toshl";
import { parseAmount, AI_INSTRUCTIONS, parseExtraJsonForTool } from "../utils/helpers";
import { isTransferEntry } from "../utils/toshl-model";
import type { TransactionInput } from "../utils/types";

type Input = {
  /** Toshl entry id (from search-entries). */
  entryId: string;
  amount?: string;
  description?: string;
  date?: string;
  categoryId?: string;
  accountId?: string;
  tagIds?: string;
  currencyCode?: string;
  /** For repeating entries only. */
  updateMode?: "one" | "tail" | "all";
  /** Mark bill / entry as completed (e.g. paid). */
  completed?: boolean;
  /**
   * JSON object string for Toshl `extra` (private metadata). When set, replaces the previous `extra` object for this entry.
   */
  extraJson?: string;
  /** Set Toshl location id on the entry. */
  locationId?: string;
};

export default async function updateEntry(input: Input) {
  const entry = await toshl.getEntry(input.entryId);
  if (isTransferEntry(entry)) {
    return {
      success: false,
      message:
        "This entry is a transfer. Use the update-transfer tool, or edit from Raycast “View Transactions” / “Search Entries”.",
      _instructions: AI_INSTRUCTIONS,
    };
  }

  const isExpense = entry.amount < 0;
  const abs =
    input.amount !== undefined && input.amount !== "" ? Math.abs(parseAmount(input.amount)) : Math.abs(entry.amount);
  const signed = isExpense ? -abs : abs;

  const tagList =
    input.tagIds
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? entry.tags;

  const payload: TransactionInput = {
    amount: signed,
    currency: {
      code: input.currencyCode || entry.currency.code,
      rate: entry.currency.rate ?? 1,
      fixed: entry.currency.fixed ?? false,
    },
    date: input.date || entry.date,
    desc: input.description ?? entry.desc ?? "",
    account: input.accountId || entry.account,
    category: input.categoryId || entry.category,
    tags: tagList || [],
    modified: entry.modified,
  };

  if (input.completed !== undefined) {
    payload.completed = input.completed;
  }

  if (input.extraJson !== undefined) {
    const er = parseExtraJsonForTool(input.extraJson);
    if (!er.ok) {
      return { success: false, message: er.message, _instructions: AI_INSTRUCTIONS };
    }
    if (er.value !== undefined) {
      payload.extra = er.value;
    }
  }

  if (input.locationId !== undefined && input.locationId.trim() !== "") {
    payload.location = { id: input.locationId.trim() };
  }

  const mode = entry.repeat ? input.updateMode || "one" : undefined;
  await toshl.updateTransaction(entry.id, payload, mode);

  return {
    success: true,
    entryId: entry.id,
    message: "Entry updated.",
    _instructions: AI_INSTRUCTIONS,
  };
}
