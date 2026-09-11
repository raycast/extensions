import { withAccessToken } from "@raycast/utils";
import { schwabOAuth } from "../lib/oauth";
import { getAccounts, getAccountNicknames } from "../lib/schwab-client";
import { getAccountAliases } from "../lib/account-aliases";
import { getAccountDisplayName, getAccountTotalValue, getCashBalance } from "../types/accounts";

/**
 * Get the user's full Schwab portfolio: every account with its balance, cash,
 * day profit/loss, and all positions (symbol, quantity, market value, day P/L,
 * unrealized P/L). Read-only.
 */
export default withAccessToken(schwabOAuth)(async () => {
  const [accounts, nicknames] = await Promise.all([
    getAccounts("positions"),
    getAccountNicknames().catch(() => ({}) as Record<string, string>),
  ]);
  const names = { ...nicknames, ...getAccountAliases() };

  let totalValue = 0;
  let totalDayProfitLoss = 0;

  const summarizedAccounts = accounts.map((account) => {
    const sa = account.securitiesAccount;
    const accountValue = getAccountTotalValue(account);
    const positions = (sa.positions ?? []).map((position) => {
      const quantity = position.longQuantity || position.shortQuantity || 0;
      const averageCost = position.averagePrice ?? position.averageLongPrice ?? position.taxLotAverageLongPrice;
      const costBasis = averageCost != null ? averageCost * quantity : undefined;
      const unrealizedProfitLoss =
        position.longOpenProfitLoss ??
        (position.marketValue != null && costBasis != null ? position.marketValue - costBasis : undefined);
      return {
        symbol: position.instrument.symbol,
        description: position.instrument.description,
        assetType: position.instrument.assetType,
        quantity,
        marketValue: position.marketValue,
        dayProfitLoss: position.currentDayProfitLoss,
        dayProfitLossPercent: position.currentDayProfitLossPercentage,
        unrealizedProfitLoss,
      };
    });

    const dayProfitLoss = positions.reduce((sum, position) => sum + (position.dayProfitLoss ?? 0), 0);
    totalValue += accountValue;
    totalDayProfitLoss += dayProfitLoss;

    return {
      name: getAccountDisplayName(account, names),
      accountNumberLast4: sa.accountNumber.slice(-4),
      type: sa.type,
      totalValue: accountValue,
      cashBalance: getCashBalance(account),
      dayProfitLoss,
      positions,
    };
  });

  const startOfDayValue = totalValue - totalDayProfitLoss;
  return {
    totalValue,
    dayProfitLoss: totalDayProfitLoss,
    dayProfitLossPercent: startOfDayValue > 0 ? (totalDayProfitLoss / startOfDayValue) * 100 : 0,
    accounts: summarizedAccounts,
  };
});
