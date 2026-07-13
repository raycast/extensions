import { getActiveAccount, listAccounts } from "../accounts/storage";

/**
 * Lists the connected Dokploy instances. Useful when the user refers to "staging" or "the client's
 * server" and the model needs to know which account names exist. API keys are never returned.
 */
export default async function tool() {
  const [accounts, active] = await Promise.all([listAccounts(), getActiveAccount()]);

  return {
    accounts: accounts.map((account) => ({
      name: account.label,
      url: account.url,
      isActive: account.id === active?.id,
    })),
  };
}
