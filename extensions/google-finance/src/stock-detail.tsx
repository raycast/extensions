import { List } from "@raycast/api";
import { Quote } from "./google-finance";
import { FinancialDetails } from "./yahoo-finance";
import { formatMoney } from "./utils";

interface StockDetailProps {
  quote: Quote;
  financials?: FinancialDetails | null;
}

export function StockDetail({ quote, financials }: StockDetailProps) {
  const f = financials;

  // Compute PEG: use stockanalysis.com value if available, otherwise calculate from P/E and Y/Y earnings growth
  let pegDisplay = f?.pegRatio || "-";
  if (!f?.pegRatio && quote.peRatio && f?.earningsGrowthYoY && f.earningsGrowthYoY > 0) {
    const pe = parseFloat(quote.peRatio);
    const growthPct = f.earningsGrowthYoY * 100;
    if (!isNaN(pe) && growthPct > 0) {
      pegDisplay = (pe / growthPct).toFixed(2);
    }
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={quote.name} />
          <List.Item.Detail.Metadata.Label title="Market Cap" text={quote.marketCap || "-"} />
          <List.Item.Detail.Metadata.Label title="Price" text={formatMoney(quote.price, quote.currency)} />
          <List.Item.Detail.Metadata.Label title="52-Week Range" text={quote.yearRange || "-"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Avg Volume" text={quote.avgVolume || "-"} />
          <List.Item.Detail.Metadata.Label title="Short Interest" text={f?.shortInterest || "-"} />
          <List.Item.Detail.Metadata.Label title="Short % of Float" text={f?.shortPercentOfFloat || "-"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Enterprise Value" text={f?.enterpriseValue || "-"} />
          <List.Item.Detail.Metadata.Label title="P/E Ratio" text={quote.peRatio || "-"} />
          <List.Item.Detail.Metadata.Label title="PEG Ratio" text={pegDisplay} />
          <List.Item.Detail.Metadata.Label title="Dividend Yield" text={quote.dividendYield || "-"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={f?.balanceSheetDate ? `Balance Sheet (${f.balanceSheetDate})` : "Balance Sheet"}
            text=""
          />
          <List.Item.Detail.Metadata.Label title="Total Assets" text={f?.totalAssets || "-"} />
          <List.Item.Detail.Metadata.Label title="Total Liabilities" text={f?.totalLiabilities || "-"} />
          <List.Item.Detail.Metadata.Label title="Total Equity" text={f?.totalEquity || "-"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
