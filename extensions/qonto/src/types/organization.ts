import { z } from "zod";
import { BankAccountSchema } from "./bank-account";

// doc: https://api-doc.qonto.com/docs/business-api/7b02610b69d70-show-organization
//

// prettier-ignore
export const OrganizationSchema = z.object({  
  slug: z.string(),                             // "super-organization-485"
  legal_name: z.string(),                       // "Super Organization Inc"
  locale: z.string(),                           // "en"
  legal_share_capital: z.number(),              // 10000
  legal_country: z.string(),                    // "EN"
  legal_registration_date: z.string(),            // "2020-10-20"
  legal_form: z.string(),                       // "Inc"
  legal_address: z.string(),                    // "1 Avenue Racyast 59000 Lille"
  legal_sector: z.string(),                     // "6201Z"
  contract_signed_at: z.string(),                 // "2020-08-20T07:27:45.434Z"
  legal_number: z.string(),                     // "12A34FC5"
  bank_accounts: z.array(BankAccountSchema),
});

export type Organization = z.infer<typeof OrganizationSchema>;
