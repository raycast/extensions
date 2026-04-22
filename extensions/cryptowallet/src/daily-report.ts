import { Clipboard, Toast, getPreferenceValues, showToast } from "@raycast/api";

import { getLatestQuotesAndConvertedTransactions } from "./coinmarketcap";
import { generatePortfolioReport } from "./report";
import { getPortfolios, getTransactions } from "./storage";

export default async function Command() {
  const { baseCurrency } = getPreferenceValues<Preferences>();

  try {
    const [portfolios, transactions] = await Promise.all([getPortfolios(), getTransactions()]);
    const pricedData = await getLatestQuotesAndConvertedTransactions(transactions, baseCurrency);
    await Clipboard.copy(generatePortfolioReport(portfolios, pricedData.transactions, pricedData.quotes, baseCurrency));
    await showToast({
      style: Toast.Style.Success,
      title: "Daily Report Copied",
      message: "Markdown report copied to clipboard.",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Daily Report Failed",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
