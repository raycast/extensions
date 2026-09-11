import { getCachedAccounts } from "../lib/moneytree";

type Input = {
  /**
   * Filter accounts to a Moneytree credential/institution id.
   */
  credentialId?: number;
  /**
   * Filter accounts by Moneytree account type, such as bank, credit_card, stock, stored_value, point, manual, or cash_wallet.
   */
  accountType?: string;
  /**
   * Include manual and cash wallet accounts. Defaults to false.
   */
  includeUnsupported?: boolean;
};

/**
 * Get Moneytree accounts with balances, currencies, account types, status, and linked credential/institution names.
 */
export default async function tool(input: Input = {}) {
  const accounts = await getCachedAccounts({ includeUnsupported: input.includeUnsupported });
  const filtered = accounts.filter((account) => {
    if (input.credentialId && account.credential_id !== input.credentialId) return false;
    if (input.accountType && account.account_type !== input.accountType) return false;
    return true;
  });

  return {
    count: filtered.length,
    accounts: filtered.map((account) => ({
      id: account.id,
      name: account.nickname || account.institution_account_name,
      accountType: account.account_type,
      subType: account.sub_type,
      detailType: account.detail_type,
      group: account.group,
      status: account.status,
      currency: account.currency,
      currentBalance: account.current_balance,
      currentBalanceInBase: account.current_balance_in_base,
      credentialId: account.credential_id,
      credentialName: account.credentialName,
      credentialStatus: account.credentialStatus,
    })),
  };
}
