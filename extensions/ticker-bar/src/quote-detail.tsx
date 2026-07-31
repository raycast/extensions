import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { marketLogo } from "./market-logo";
import { getCachedQuotes, Quote, refreshQuotes } from "./market";
import {
  compactNumber,
  formatAge,
  formatPercent,
  quoteFreshness,
} from "./market-format";

export function QuoteDetail({
  id,
  initialQuote,
}: {
  id: string;
  initialQuote?: Quote;
}) {
  const [quote, setQuote] = useState(initialQuote);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(!initialQuote);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cached = (await getCachedQuotes())[id];
        if (!cancelled && cached) setQuote(cached);
        const report = await refreshQuotes([id]);
        const fresh = report.quotes[id];
        if (!cancelled && fresh) setQuote(fresh);
        if (!cancelled && report.failures[0])
          setError(report.failures[0].message);
        if (!fresh && !cached) throw new Error("No quote was returned");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "The quote could not be loaded",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const markdown = useMemo(() => {
    if (!quote) {
      return error
        ? `# Quote unavailable\n\n${escapeMarkdown(error)}`
        : "# Loading quote…";
    }
    const change =
      typeof quote.changePercent === "number"
        ? ` ${formatPercent(quote.changePercent)}`
        : "";
    const status =
      error || quoteFreshness(quote) === "stale"
        ? `> ⚠️ Cached quote — ${escapeMarkdown(error ?? quote.error ?? "the latest refresh failed")}`
        : `Updated ${formatAge(quote.lastSuccessAt ?? quote.asOf)}`;
    return `# ${escapeMarkdown(quote.symbol)} ${escapeMarkdown(quote.priceLabel)}${change}\n\n${status}`;
  }, [error, quote]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={quote ? <QuoteMetadata quote={quote} /> : undefined}
      actions={
        quote ? (
          <ActionPanel>
            {quote.url ? (
              <Action
                title="Open Market"
                icon={Icon.Globe}
                onAction={() => open(quote.url!)}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Price"
              content={quote.price.toString()}
            />
            <Action.CopyToClipboard title="Copy Asset ID" content={quote.id} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function QuoteMetadata({ quote }: { quote: Quote }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Asset"
        text={quote.name}
        icon={marketLogo(quote, Icon.LineChart)}
      />
      <Detail.Metadata.Label title="Provider" text={quote.provider} />
      {quote.marketState ? (
        <Detail.Metadata.Label title="Market State" text={quote.marketState} />
      ) : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Price" text={quote.priceLabel} />
      {typeof quote.changePercent === "number" ? (
        <Detail.Metadata.Label
          title="24h Change"
          text={formatPercent(quote.changePercent)}
        />
      ) : null}
      {typeof quote.open === "number" ? (
        <Detail.Metadata.Label title="Open" text={quote.open.toString()} />
      ) : null}
      {typeof quote.high === "number" ? (
        <Detail.Metadata.Label title="High" text={quote.high.toString()} />
      ) : null}
      {typeof quote.low === "number" ? (
        <Detail.Metadata.Label title="Low" text={quote.low.toString()} />
      ) : null}
      {typeof quote.previousClose === "number" ? (
        <Detail.Metadata.Label
          title="Previous Close"
          text={quote.previousClose.toString()}
        />
      ) : null}
      {typeof quote.volume === "number" ? (
        <Detail.Metadata.Label
          title="Volume"
          text={compactNumber(quote.volume)}
        />
      ) : null}
      {typeof quote.marketCap === "number" ? (
        <Detail.Metadata.Label
          title="Market Cap"
          text={compactNumber(quote.marketCap)}
        />
      ) : null}
      {typeof quote.fundingRate === "number" ? (
        <Detail.Metadata.Label
          title="Funding Rate"
          text={`${(quote.fundingRate * 100).toFixed(4)}%`}
        />
      ) : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Quote Time"
        text={new Date(quote.asOf).toLocaleString()}
      />
      <Detail.Metadata.Label
        title="Last Refresh"
        text={formatAge(quote.lastSuccessAt ?? quote.asOf)}
      />
    </Detail.Metadata>
  );
}

function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}
