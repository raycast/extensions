import { loadEachLogin } from "../logins";
import { getTreasuryAccounts } from "../mercury";

/**
 * Retrieves Mercury Treasury accounts for every connected Mercury account, with balances and
 * the last 12 months of net returns. Organizations that couldn't be reached are listed in
 * `unavailable`.
 */
export default async function getTreasury() {
  const { results, unavailable } = await loadEachLogin(async (login) =>
    (await getTreasuryAccounts(login.token)).map(({ netReturns, ...account }) => ({
      organization: login.name,
      ...account,
      recentNetReturns: [...netReturns].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12),
    })),
  );
  return { treasury: results.flatMap(({ value }) => value), unavailable };
}
