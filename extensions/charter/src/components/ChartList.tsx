import { List } from "@raycast/api";
import { PROVIDERS } from "../data/providers";
import { lensProvider, mermaidTag, searchKeywords, type ChartType, type Provider } from "../lib/catalog";
import { thumbnailMarkdown } from "../lib/thumbnails";
import ChartActions from "./ChartActions";
import { providerSection } from "./ChartDetail";
import type { BrowseProps } from "./ChartGrid";
import ChartMetadata from "./ChartMetadata";
import LensDropdown from "./LensDropdown";

function accessories(chart: ChartType, compact: boolean): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  const mermaid = mermaidTag(chart);
  if (mermaid)
    items.push({ tag: { value: compact ? "M" : mermaid, color: PROVIDERS.mermaid.color }, tooltip: mermaid });
  if (chart.shadcn) {
    items.push({
      tag: { value: compact ? "S" : PROVIDERS.shadcn.title, color: PROVIDERS.shadcn.color },
      tooltip: "shadcn",
    });
  }
  if (chart.echarts) {
    items.push({
      tag: { value: compact ? "E" : PROVIDERS.echarts.title, color: PROVIDERS.echarts.color },
      tooltip: "ECharts",
    });
  }
  return items;
}

/** The panel is short, so the thumbnail is fixed at a size that leaves room for the metadata. */
const PANEL_THUMBNAIL = { width: 240, height: 160 };
const PANEL_LINES = 30;

function panelMarkdown(chart: ChartType, provider: Provider): string {
  const section = providerSection(chart, provider, PANEL_LINES);
  return `${thumbnailMarkdown(chart, provider, PANEL_THUMBNAIL)}${chart.use}\n\n${section}`;
}

export default function ChartList(props: BrowseProps) {
  const {
    sections,
    isLoading,
    isFavorite,
    onToggleFavorite,
    onUse,
    onClearRecent,
    lens,
    onLensChange,
    viewMode,
    onViewModeChange,
    showDetail,
    onToggleDetail,
    columns,
    onColumnsChange,
  } = props;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search chart types"
      searchBarAccessory={<LensDropdown value={lens} onChange={onLensChange} />}
    >
      {sections.map((section) => (
        <List.Section key={section.id} title={section.title}>
          {section.charts.map((chart) => {
            const provider = lensProvider(chart, lens);
            return (
              <List.Item
                key={`${section.id}-${chart.id}`}
                title={chart.name}
                subtitle={showDetail ? undefined : chart.use}
                keywords={searchKeywords(chart)}
                accessories={accessories(chart, showDetail)}
                detail={
                  <List.Item.Detail
                    markdown={panelMarkdown(chart, provider)}
                    metadata={<ChartMetadata chart={chart} />}
                  />
                }
                actions={
                  <ChartActions
                    chart={chart}
                    provider={provider}
                    isFavorite={isFavorite(chart.id)}
                    onToggleFavorite={onToggleFavorite}
                    onUse={onUse}
                    browse={{
                      onClearRecent,
                      viewMode,
                      onSwitchView: () => onViewModeChange("grid"),
                      showDetail,
                      onToggleDetail,
                      columns,
                      onColumnsChange,
                    }}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
