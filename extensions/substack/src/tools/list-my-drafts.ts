import { resolveAccount } from "@/lib/accounts";
import { listNewsletterDrafts } from "@/lib/listDrafts";

type Input = {
  /** Connection ID returned by list-accounts. Omit only to use the default or sole account. */
  accountId?: string;
  /** Offset from the previous page's nextOffset. Omit for the first page. */
  offset?: number;
};
export default async function tool(input: Input) {
  return listNewsletterDrafts(await resolveAccount(input.accountId), input.offset);
}
