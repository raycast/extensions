import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { fetchPrices } from "./lib/prices";
import { formatDate, formatUsd } from "./lib/utils";

export default function Command() {
  const {
    isLoading,
    data: prices,
    error,
    revalidate,
  } = usePromise(fetchPrices, [], { execute: true });

  if (isLoading) {
    return <Detail isLoading markdown="## Fetching Bitcoin price…" />;
  }

  if (error || !prices) {
    return (
      <Detail
        markdown={`## Failed to fetch price\n\n${error?.message || "Unable to retrieve Bitcoin price."}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Mempool.space"
              url="https://mempool.space"
            />
            <Action
              icon={Icon.RotateClockwise}
              title="Refresh Price"
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  const priceUsd = prices.USD;
  const formattedPrice = formatUsd(priceUsd);
  const priceTime = formatDate(prices.time);

  const markdown = `
# Bitcoin Price

## ${formattedPrice} USD

| Currency | Price |
|---|---|
| **USD** | ${formatUsd(prices.USD)} |
| **EUR** | €${prices.EUR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
| **GBP** | £${prices.GBP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
| **CAD** | C$${prices.CAD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
| **CHF** | CHF ${prices.CHF.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
| **AUD** | A$${prices.AUD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
| **JPY** | ¥${prices.JPY.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} |

_Last updated: ${priceTime}_
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Usd Price"
            content={String(priceUsd)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
          <Action.CopyToClipboard
            title="Copy All Prices (JSON)"
            content={JSON.stringify(prices, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
          <Action.OpenInBrowser
            title="Open on Mempool.space"
            url="https://mempool.space"
            icon={Icon.Globe}
          />
          <Action
            icon={Icon.RotateClockwise}
            title="Refresh Price"
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
