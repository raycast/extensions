import { requireLogins } from "../logins";
import { getTreasuryAccounts } from "../mercury";

/**
 * Retrieves Mercury Treasury accounts for every connected Mercury account, with balances and
 * the last 12 months of net returns.
 */
export default async function getTreasury() {
  const logins = await requireLogins();
  const results = await Promise.all(
    logins.map(async (login) =>
      (await getTreasuryAccounts(login.token)).map(({ netReturns, ...account }) => ({
        organization: login.name,
        ...account,
        recentNetReturns: [...netReturns].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12),
      })),
    ),
  );
  return results.flat();
}
