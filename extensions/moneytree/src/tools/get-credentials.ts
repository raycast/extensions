import { getCredentialName, getCredentialTotalBalance, getCachedCredentials } from "../lib/moneytree";

type Input = {
  /**
   * Filter credentials by Moneytree status, such as success, manual, or errored statuses.
   */
  status?: string;
  /**
   * Include per-account balance details for each credential. Defaults to false.
   */
  includeAccounts?: boolean;
};

/**
 * Get Moneytree credentials/institutions, their connection statuses, account counts, refresh metadata, and total balances.
 */
export default async function tool(input: Input = {}) {
  const credentials = await getCachedCredentials();
  const filtered = credentials.filter((credential) => !input.status || credential.status === input.status);

  return {
    count: filtered.length,
    credentials: filtered.map((credential) => ({
      id: credential.id,
      name: getCredentialName(credential),
      institutionId: credential.institution_id,
      status: credential.status,
      error: credential.error_info
        ? {
            reason: credential.error_info.reason,
            description: credential.error_info.localized_description || credential.error_info.localized_reason,
            actionable: credential.error_info.actionable,
          }
        : null,
      accountCount: credential.accounts.length,
      totalBalanceInBase: getCredentialTotalBalance(credential),
      lastSuccess: credential.last_success,
      statusSetAt: credential.status_set_at,
      updatedAt: credential.updated_at,
      accounts: input.includeAccounts
        ? credential.accounts.map((account) => ({
            id: account.id,
            name: account.nickname || account.institution_account_name,
            accountType: account.account_type,
            status: account.status,
            currency: account.currency,
            currentBalance: account.current_balance,
            currentBalanceInBase: account.current_balance_in_base,
          }))
        : undefined,
    })),
  };
}
