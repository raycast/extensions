import { requireLogins } from "../logins";
import { getAccounts, getCreditAccounts } from "../mercury";

/**
 * Retrieves every connected Mercury account (personal and business) with its bank accounts,
 * balances, status, and account numbers, plus any credit balances owed.
 */
export default async function () {
  const logins = await requireLogins();
  return Promise.all(
    logins.map(async (login) => {
      const [accounts, credit] = await Promise.all([getAccounts(login.token), getCreditAccounts(login.token)]);
      return {
        organization: login.name,
        kind: login.kind,
        accounts,
        credit: credit.map((account) => ({ ...account, owed: Math.abs(account.currentBalance) })),
      };
    }),
  );
}
