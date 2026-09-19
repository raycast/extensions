import { Grid } from "@raycast/api";
import type { ViewMode } from "../hooks/useViewMode";
import { lensProvider, searchKeywords, tileSubtitle, type Lens } from "../lib/catalog";
import type { ChartSection } from "../lib/sections";
import { tileContent } from "../lib/thumbnails";
import ChartActions from "./ChartActions";
import LensDropdown from "./LensDropdown";

export interface BrowseProps {
  sections: ChartSection[];
  isLoading: boolean;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => Promise<boolean>;
  /** Called when a type is opened or copied from, so it joins the Recent section. */
  onUse: (id: string) => Promise<void>;
  /** Absent when there is nothing to clear. */
  onClearRecent?: () => Promise<void>;
  lens: Lens;
  onLensChange: (lens: Lens) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showDetail: boolean;
  onToggleDetail: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
}

export default function ChartGrid(props: BrowseProps) {
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
    <Grid
      isLoading={isLoading}
      columns={columns}
      aspectRatio="3/2"
      fit={Grid.Fit.Contain}
      searchBarPlaceholder="Search chart types"
      searchBarAccessory={<LensDropdown value={lens} onChange={onLensChange} />}
    >
      {sections.map((section) => (
        <Grid.Section key={section.id} title={section.title}>
          {section.charts.map((chart) => {
            const provider = lensProvider(chart, lens);
            return (
              <Grid.Item
                key={`${section.id}-${chart.id}`}
                content={tileContent(chart, provider)}
                title={chart.name}
                subtitle={tileSubtitle(chart, lens)}
                keywords={searchKeywords(chart)}
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
                      onSwitchView: () => onViewModeChange("list"),
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
        </Grid.Section>
      ))}
    </Grid>
  );
}
