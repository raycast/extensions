/**
 * Quote detail view component.
 */

import { Action, ActionPanel, Detail } from "@raycast/api";
import type { TransferWiseQuote } from "../../api/endpoints";
import { formatCurrency, formatDate } from "../../lib/formatters";

interface QuoteDetailProps {
  quote: TransferWiseQuote;
  sourceCurrency: string;
  targetCurrency: string;
}

export function QuoteDetail({ quote, sourceCurrency, targetCurrency }: QuoteDetailProps) {
  const sourceAmount = quote.amount_source
    ? formatCurrency(quote.amount_source.value, quote.amount_source.currency)
    : "N/A";
  const targetAmount = quote.amount_target
    ? formatCurrency(quote.amount_target.value, quote.amount_target.currency)
    : "N/A";
  const rate = quote.rate || "N/A";
  const expiryTime = quote.time_expiry ? formatDate(quote.time_expiry) : "N/A";

  const markdown = `# Exchange Quote

## You Send
**${sourceAmount}**

## You Receive
**${targetAmount}**

---

**Exchange Rate:** 1 ${sourceCurrency} = ${rate} ${targetCurrency}

**Quote Expires:** ${expiryTime}

---

*To complete the transfer, please use the bunq app.*
`;

  return (
    <Detail
      navigationTitle="Quote Details"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={sourceAmount} />
          <Detail.Metadata.Label title="To" text={targetAmount} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Rate" text={`1 ${sourceCurrency} = ${rate} ${targetCurrency}`} />
          {quote.time_expiry && <Detail.Metadata.Label title="Expires" text={formatDate(quote.time_expiry)} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Complete Transfer" target="https://bunq.com/app" text="Open bunq app" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Bunq App" url="https://bunq.com/app" />
          <Action.CopyToClipboard title="Copy Rate" content={`1 ${sourceCurrency} = ${rate} ${targetCurrency}`} />
        </ActionPanel>
      }
    />
  );
}
