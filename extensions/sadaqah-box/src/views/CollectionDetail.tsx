import { useMemo } from "react";
import { Detail, Color } from "@raycast/api";
import type { Collection, Box } from "../types";
import { getRandomQuote } from "../services/quote-service";
import { getTranslation } from "../data/quotes";
import { isQuoteResultAyah, isQuoteResultHadith } from "../utils/type-guards";
import { formatValue, formatDate } from "../utils/format";

interface CollectionDetailProps {
  collection: Collection;
  box: Box;
}

export default function CollectionDetail({ collection, box }: CollectionDetailProps) {
  const currencyCode = collection.currency?.code || collection.currencyId;

  const quote = useMemo(() => {
    const result = getRandomQuote("any");

    if (isQuoteResultAyah(result)) {
      const ayah = result.data;
      return {
        text: getTranslation(ayah.translation, "en"),
        source: `Quran ${ayah.verse}`,
        arabic: ayah.arabic,
      };
    }

    if (isQuoteResultHadith(result)) {
      const hadith = result.data;
      const shortSource = hadith.source.split("(")[0]?.trim() || hadith.source;
      return {
        text: getTranslation(hadith.translation, "en"),
        source: shortSource,
        arabic: hadith.arabic,
      };
    }

    return { text: "", source: "", arabic: "" };
  }, [collection.id]);

  const conversion = useMemo(() => {
    const storedPreferredCode = collection.metadata?.preferredCurrencyCode;
    const conversions = collection.metadata?.conversions || [];

    if (storedPreferredCode && storedPreferredCode !== currencyCode) {
      return conversions.find((c) => c.code === storedPreferredCode);
    }
    return undefined;
  }, [collection, currencyCode]);

  const extraValues = useMemo(() => {
    if (!collection.totalValueExtra) return [];
    return Object.values(collection.totalValueExtra);
  }, [collection.totalValueExtra]);

  const markdown = useMemo(() => {
    let content = `# Collection Report\n\n`;

    content += `## Total Sadaqah\n\n`;
    content += `### ${formatValue(collection.totalValue)} ${currencyCode}\n\n`;

    if (conversion) {
      content += `**Approximately:** ${conversion.symbol || ""}${formatValue(conversion.value)} ${conversion.name}\n\n`;
      content += `*1 ${currencyCode} = ${formatValue(conversion.rate)} ${conversion.code}*\n\n`;
    }

    if (extraValues.length > 0) {
      content += `## Other Sadaqah\n\n`;
      extraValues.forEach((extra) => {
        content += `- ${formatValue(extra.total)} ${extra.name} (${extra.code})\n`;
      });
      content += `\n`;
    }

    if (quote.text) {
      content += `---\n\n`;
      content += `> ${quote.text}\n\n`;
      if (quote.arabic) {
        content += `*${quote.arabic}*\n\n`;
      }
      content += `— *${quote.source}*\n`;
    }

    return content;
  }, [collection.totalValue, currencyCode, conversion, extraValues, quote]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Collection - ${box.name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Box" text={box.name} />
          <Detail.Metadata.Label title="Box ID" text={box.id} />
          <Detail.Metadata.Label
            title="Date"
            text={formatDate(collection.emptiedAt, { includeTime: true, longMonth: true })}
          />
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
