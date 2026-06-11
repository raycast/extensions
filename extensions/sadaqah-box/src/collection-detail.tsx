import { useMemo } from "react";
import { Detail, Color } from "@raycast/api";
import type { Collection, Box } from "./types";
import { getQuoteService } from "./services/quote-service";
import { getTranslation, type QuoteResult } from "./data/quotes";
import { isQuoteResultAyah, isQuoteResultHadith } from "./utils/type-guards";

interface CollectionDetailProps {
  collection: Collection;
  box: Box;
}

export default function CollectionDetail({ collection, box }: CollectionDetailProps) {
  const currencyCode = collection.currency?.code || collection.currencyId;
  const currencyName = collection.currency?.name || currencyCode;

  // Get a random quote for this collection view
  const quote = useMemo(() => {
    const quoteService = getQuoteService();
    const result: QuoteResult = quoteService.getRandomQuote("any");

    // Use type guards instead of type assertions
    if (isQuoteResultAyah(result)) {
      const ayah = result.data;
      const text = getTranslation(ayah.translation, "en");
      return {
        text: text,
        source: `Quran ${ayah.verse}`,
        arabic: ayah.arabic,
      };
    } else if (isQuoteResultHadith(result)) {
      const hadith = result.data;
      const text = getTranslation(hadith.translation, "en");
      const shortSource = hadith.source.split("(")[0]?.trim() || hadith.source;
      return {
        text: text,
        source: shortSource,
        arabic: hadith.arabic,
      };
    }

    // Fallback for unexpected cases
    return {
      text: "",
      source: "",
      arabic: "",
    };
  }, [collection.id]);

  // Format value with proper decimals
  const formatValue = (value: number): string => {
    return value.toFixed(5).replace(/\.?0+$/, "");
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get conversion to show (preferred currency if available)
  const conversion = useMemo(() => {
    const storedPreferredCode = collection.metadata?.preferredCurrencyCode;
    const conversions = collection.metadata?.conversions || [];

    if (storedPreferredCode && storedPreferredCode !== currencyCode) {
      return conversions.find((c) => c.code === storedPreferredCode);
    }
    return undefined;
  }, [collection, currencyCode]);

  // Get extra values
  const extraValues = useMemo(() => {
    if (!collection.totalValueExtra) return [];
    return Object.values(collection.totalValueExtra);
  }, [collection.totalValueExtra]);

  // Build markdown content
  const markdown = useMemo(() => {
    let content = `# Collection Report\n\n`;

    // Total Value
    content += `## Total Sadaqah\n\n`;
    content += `### ${formatValue(collection.totalValue)} ${currencyCode}\n\n`;

    if (conversion) {
      content += `**Approximately:** ${conversion.symbol || ""}${formatValue(conversion.value)} ${conversion.name}\n\n`;
      content += `*1 ${currencyCode} = ${formatValue(conversion.rate)} ${conversion.code}*\n\n`;
    }

    // Extra Values
    if (extraValues.length > 0) {
      content += `## Other Sadaqah\n\n`;
      extraValues.forEach((extra) => {
        content += `- ${formatValue(extra.total)} ${extra.name} (${extra.code})\n`;
      });
      content += `\n`;
    }

    // Quote
    if (quote.text) {
      content += `---\n\n`;
      content += `> ${quote.text}\n\n`;
      if (quote.arabic) {
        content += `*${quote.arabic}*\n\n`;
      }
      content += `— *${quote.source}*\n`;
    }

    return content;
  }, [collection, box, currencyCode, currencyName, conversion, extraValues, quote]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Collection - ${box.name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Box" text={box.name} />
          <Detail.Metadata.Label title="Box ID" text={box.id} />
          <Detail.Metadata.Label title="Date" text={formatDate(collection.emptiedAt)} />
          <Detail.Metadata.Label title="Total Value" text={`${formatValue(collection.totalValue)} ${currencyCode}`} />
          {conversion && (
            <Detail.Metadata.Label
              title="Converted Value"
              text={`${conversion.symbol || ""}${formatValue(conversion.value)} ${conversion.code}`}
            />
          )}
          {extraValues.length > 0 && (
            <Detail.Metadata.TagList title="Other Values">
              {extraValues.map((extra) => (
                <Detail.Metadata.TagList.Item
                  key={extra.code}
                  text={`${extra.code}: ${formatValue(extra.total)}`}
                  color={Color.SecondaryText}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
