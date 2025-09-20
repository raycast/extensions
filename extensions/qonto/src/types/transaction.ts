import { z } from "zod";

// doc: https://api-doc.qonto.com/docs/business-api/2c89e53f7f645-list-transactions
//

export const TransactionTypeSchema = z.enum([
  "income",
  "transfer",
  "card",
  "direct_debit",
  "qonto_fee",
  "cheque",
  "recall",
  "swift_income",
]);

// prettier-ignore
export const TransactionSchema = z.object({
  transaction_id: z.string(),
  amount: z.number(),
  amount_cents: z.number(),
  settled_balance: z.number(),
  settled_balance_cents: z.number(),
  attachment_ids: z.array(z.string()),
  local_amount: z.number(),                 // 0.43
  local_amount_cents: z.number(),           // 43
  side: z.enum(["debit", "credit"]),        // "debit"
  operation_type: TransactionTypeSchema, 
  currency: z.string(),                     // "EUR"
  local_currency: z.string(),               // "EUR"
  label: z.string(),                        // "Ferry-Purdy"
  settled_at: z.string(),                   // "2021-03-03T16:06:38.000Z"
  emitted_at: z.string(),                   // "2021-02-25T16:22:37.000Z"
  updated_at: z.string(),                   // "2020-12-12T19:52:10.000Z"
  status: z.enum([
    "pending", 
    "completed", 
    "declined"
  ]),
  note: z.string().nullish(),              // "Rhea Ernser"
  reference: z.string().nullable(),
  vat_amount: z.number().nullable(),
  vat_amount_cents: z.number().nullable(),
  vat_rate: z.number().nullable(),
  initiator_id: z.string().nullable(),      // "ccdcef78-1aa1-4d44-b991-b10005a4ad1a"
  label_ids: z.array(z.string()),           // ["6450e541-0a6f-4153-a46e-34d98848e280"]
  attachment_lost: z.boolean(),             // false
  attachment_required: z.boolean(),         // true
  card_last_digits: z.string().nullable(),  // "1234"
  category: z.string(),                     // "gas_station"
  id: z.string(),                           // "df346899-3595-421a-8b26-f9d9616ce496"
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
