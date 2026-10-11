import { defaultAccountId, listAccounts } from "@/lib/accounts";

export default async function tool() {
  const accounts = await listAccounts();
  const defaultId = await defaultAccountId();
  return accounts.map((account) => ({ ...account, isDefault: account.id === defaultId }));
}
