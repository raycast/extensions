export type ListAccountsInput = {
  /** Optional account category. Crypto accounts can be INVESTMENT; omit to find all accounts. */
  account_category?: "BANK" | "INVESTMENT" | "DEPOSIT" | "LOC";
  /** Return the full redacted account record. Leave false unless additional fields are needed. */
  verbose?: boolean;
};

export type AccountBalanceInput = {
  /** Exact account ID string returned by list-accounts. Never guess an ID. */
  account_id: string;
};

export type ListHoldingsInput = {
  /** Exact account ID from list-accounts. Omit to include all investment and crypto accounts. */
  account_id?: string;
};

export type ListTransactionsInput = {
  /** Exact account ID from list-accounts. Omit to span all permitted accounts. */
  account_id?: string;
  /** Inclusive start date, YYYY-MM-DD. Defaults to 30 days before to. */
  from?: string;
  /** Inclusive end date, YYYY-MM-DD. Defaults to today. */
  to?: string;
  /** Rows per page, 1–100; defaults to 50. A short or empty page can still have more results. */
  limit?: number;
  /** Copy meta.next_cursor exactly to fetch the next page; retain the same other filters. */
  cursor?: string;
  /** mapped matches the dates shown in Synci (default). Use booking/value only when requested. */
  date_field?: "mapped" | "booking" | "value";
  /** all includes booked and pending (default). Use booked for settled spending totals. */
  status?: "all" | "booked" | "pending";
  /** Full redacted transaction record. Leave false unless additional fields are needed. */
  verbose?: boolean;
};

export type McpToolName =
  "list_accounts" | "get_account_balance" | "list_transactions" | "list_holdings" | "list_connections";

const fields: Record<McpToolName, string[]> = {
  list_accounts: ["account_category", "verbose"],
  get_account_balance: ["account_id"],
  list_transactions: ["account_id", "from", "to", "limit", "cursor", "date_field", "status", "verbose"],
  list_holdings: ["account_id"],
  list_connections: [],
};

/** Validate the AI boundary before requesting credentials or making a network call. */
export function mcpArguments(name: McpToolName, input: unknown): Record<string, unknown> {
  if (!Object.hasOwn(fields, name))
    throw new Error("This Synci tool is not supported. Only read-only financial tools are available.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Tool input must be an object.");
  const args = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  if (Object.keys(args).some((key) => !fields[name].includes(key)))
    throw new Error("Unsupported tool argument. Use only the fields in this tool's input schema.");
  if (name === "get_account_balance" && args.account_id === undefined)
    throw new Error("account_id is required. Call list-accounts to find it.");
  if (args.account_id !== undefined && (typeof args.account_id !== "string" || !/^\d+$/.test(args.account_id)))
    throw new Error("account_id must be the exact numeric ID string returned by list-accounts.");
  for (const key of ["from", "to"]) {
    const value = args[key];
    if (value === undefined) continue;
    const date =
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : undefined;
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      throw new Error(`${key} must be a valid date in YYYY-MM-DD format.`);
  }
  if (typeof args.from === "string" && typeof args.to === "string" && args.from > args.to)
    throw new Error("from must be on or before to.");
  if (
    args.limit !== undefined &&
    (typeof args.limit !== "number" || !Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)
  )
    throw new Error("limit must be an integer from 1 to 100.");
  if (args.cursor !== undefined && (typeof args.cursor !== "string" || !args.cursor || args.cursor.length > 4096))
    throw new Error("cursor must be copied from meta.next_cursor in the preceding response.");
  if (args.verbose !== undefined && typeof args.verbose !== "boolean") throw new Error("verbose must be a boolean.");
  const enums: Record<string, string[]> = {
    account_category: ["BANK", "INVESTMENT", "DEPOSIT", "LOC"],
    date_field: ["mapped", "booking", "value"],
    status: ["all", "booked", "pending"],
  };
  for (const [key, allowed] of Object.entries(enums)) {
    if (args[key] !== undefined && (typeof args[key] !== "string" || !allowed.includes(args[key] as string)))
      throw new Error(`${key} must be one of: ${allowed.join(", ")}.`);
  }
  return args;
}
