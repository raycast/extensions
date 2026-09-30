import { z } from "zod";

// prettier-ignore
export const BankAccountSchema = z.object({
  slug: z.string(),                     // "super-bankaccount-7438"
  iban: z.string(),                     // "FR7616798000010000005663951"
  bic: z.string(),                      // "TRZOFR21XXX"
  currency: z.string(),                 // "EUR"
  balance: z.number(),                  // 100
  balance_cents: z.number(),            // 10000
  authorized_balance: z.number(),       // 100
  authorized_balance_cents: z.number(), // 10000
  name: z.string(),                     // "Main account"
  updated_at: z.string(),               // "2023-02-21T15:30:00.000Z",
  status: z.enum(["active", "closed"]), // "active",
});

export type BankAccount = z.infer<typeof BankAccountSchema>;
