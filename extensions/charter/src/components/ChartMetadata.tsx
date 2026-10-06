import { Color, Detail } from "@raycast/api";
import { familyInfo } from "../data/families";
import { PROVIDERS } from "../data/providers";
import { mermaidLabel, missingProviders, type ChartType } from "../lib/catalog";

/**
 * The structured half of a chart: family, one link row per provider that can
 * draw it (keyword as the text, first Mermaid release folded in), one row
 * naming the providers that cannot, then synonyms. Detail.Metadata and
 * List.Item.Detail.Metadata are the same component, so one tree serves both.
 */
export default function ChartMetadata({ chart }: { chart: ChartType }) {
  const { mermaid, shadcn, echarts } = chart;
  const missing = missingProviders(chart);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Family" text={familyInfo(chart.family).title} />
      {mermaid && (
        <Detail.Metadata.Link title={PROVIDERS.mermaid.title} target={mermaid.docs} text={mermaidLabel(chart) ?? ""} />
      )}
      {shadcn && <Detail.Metadata.Link title={PROVIDERS.shadcn.title} target={shadcn.docs} text={shadcn.block} />}
      {echarts && <Detail.Metadata.Link title={PROVIDERS.echarts.title} target={echarts.docs} text={echarts.series} />}
      {missing.length > 0 && (
        <Detail.Metadata.Label
          title="Not available"
          text={missing.map((provider) => PROVIDERS[provider].title).join(", ")}
        />
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Also known as">
        {chart.synonyms.map((synonym) => (
          <Detail.Metadata.TagList.Item key={synonym} text={synonym} color={Color.SecondaryText} />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}
