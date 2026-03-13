import { z } from "zod";

// doc: https://api-doc.qonto.com/docs/business-api/7b02610b69d70-show-organization
//

// prettier-ignore
export const MembershipSchema = z.object({
  id: z.string(),         // "12345"
  first_name: z.string(), // "Pierre"
  last_name: z.string(),  // "Niney"
  role: z.enum([
    "owner",
    "admin",
    "manager",
    "reporting",
    "employee"
  ]), 
});

export type Membership = z.infer<typeof MembershipSchema>;
