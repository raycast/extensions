import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const SOURCE_URL = "https://www.hamropatro.com/gold";

type Rate = {
  name: string;
  value: number;
  formattedValue: string;
};

type GoldSilverRates = {
  lastUpdated?: string;
  rates: Rate[];
};

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCurrency(valueBlock: string): number {
  const match = valueBlock.match(/([\d,]+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not parse price value from: ${valueBlock}`);
  }

  const value = Number.parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(value)) {
    throw new Error(`Parsed an invalid price value from: ${valueBlock}`);
  }

  return value;
}

function formatNpr(value: number): string {
  return `NPR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseRates(html: string): GoldSilverRates {
  const lastUpdatedMatch = html.match(/<p><b>\s*Last Updated:\s*([^<]+)\s*<\/b><\/p>/i);
  const lastUpdated = lastUpdatedMatch?.[1]?.trim();

  const listMatch = html.match(/<ul class="gold-silver"[^>]*>([\s\S]*?)<\/ul>/i);
  if (!listMatch) {
    throw new Error("Could not find rates list in source website response.");
  }

  const listItems = [...listMatch[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => stripHtml(match[1]));

  if (listItems.length < 2) {
    throw new Error("Rates list was found, but it did not contain enough items.");
  }

  const rates: Rate[] = [];
  for (let index = 0; index < listItems.length - 1; index += 2) {
    const name = listItems[index];
    const rawValue = listItems[index + 1];

    if (!name) {
      continue;
    }

    const value = parseCurrency(rawValue);
    rates.push({
      name,
      value,
      formattedValue: formatNpr(value),
    });
  }

  if (rates.length === 0) {
    throw new Error("No rate values were parsed from the source website.");
  }

  return {
    lastUpdated,
    rates,
  };
}

async function fetchGoldSilverRates(): Promise<GoldSilverRates> {
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch source website (${response.status} ${response.statusText}).`);
  }

  const html = await response.text();
  return parseRates(html);
}

function getUnit(name: string): "tola" | "10g" | "other" {
  if (/\b10g\b/i.test(name)) {
    return "10g";
  }

  if (/\btola\b/i.test(name)) {
    return "tola";
  }

  return "other";
}

function getRateIcon(name: string) {
  const isSilver = name.toLowerCase().includes("silver");
  return {
    source: Icon.Coin,
    tintColor: isSilver ? "#C0C0C0" : "#D4AF37",
  };
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchGoldSilverRates, [], {
    keepPreviousData: true,
  });

  const tolaRates = data?.rates.filter((rate) => getUnit(rate.name) === "tola") ?? [];
  const tenGramRates = data?.rates.filter((rate) => getUnit(rate.name) === "10g") ?? [];
  const otherRates = data?.rates.filter((rate) => getUnit(rate.name) === "other") ?? [];
  const hasAnyRate = tolaRates.length > 0 || tenGramRates.length > 0 || otherRates.length > 0;

  return (
    <List isLoading={isLoading}>
      {!isLoading && !hasAnyRate && error ? (
        <List.EmptyView
          title="Could Not Fetch Gold/Silver Rates"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Source Website" url={SOURCE_URL} />
            </ActionPanel>
          }
        />
      ) : null}

      {tolaRates.length > 0 ? (
        <List.Section title="Tola">
          {tolaRates.map((rate) => (
            <List.Item
              key={rate.name}
              title={rate.name}
              icon={getRateIcon(rate.name)}
              accessories={[{ text: rate.formattedValue }]}
              actions={
                <ActionPanel>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action.CopyToClipboard title="Copy Price" content={rate.formattedValue} />
                  <Action.CopyToClipboard title="Copy Row" content={`${rate.name}: ${rate.formattedValue}`} />
                  <Action.OpenInBrowser title="Open Source Website" url={SOURCE_URL} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {tenGramRates.length > 0 ? (
        <List.Section title="10g">
          {tenGramRates.map((rate) => (
            <List.Item
              key={rate.name}
              title={rate.name}
              icon={getRateIcon(rate.name)}
              accessories={[{ text: rate.formattedValue }]}
              actions={
                <ActionPanel>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action.CopyToClipboard title="Copy Price" content={rate.formattedValue} />
                  <Action.CopyToClipboard title="Copy Row" content={`${rate.name}: ${rate.formattedValue}`} />
                  <Action.OpenInBrowser title="Open Source Website" url={SOURCE_URL} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {otherRates.length > 0 ? (
        <List.Section title="Other">
          {otherRates.map((rate) => (
            <List.Item
              key={rate.name}
              title={rate.name}
              icon={getRateIcon(rate.name)}
              accessories={[{ text: rate.formattedValue }]}
              actions={
                <ActionPanel>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action.CopyToClipboard title="Copy Price" content={rate.formattedValue} />
                  <Action.CopyToClipboard title="Copy Row" content={`${rate.name}: ${rate.formattedValue}`} />
                  <Action.OpenInBrowser title="Open Source Website" url={SOURCE_URL} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {data?.lastUpdated ? (
        <List.Section title="Info">
          <List.Item
            title="Last Updated"
            subtitle={data.lastUpdated}
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action.CopyToClipboard title="Copy Last Updated" content={data.lastUpdated} />
                <Action.OpenInBrowser title="Open Source Website" url={SOURCE_URL} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
