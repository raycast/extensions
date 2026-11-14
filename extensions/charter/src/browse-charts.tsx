import { useMemo } from "react";
import ChartGrid from "./components/ChartGrid";
import ChartList from "./components/ChartList";
import { CHARTS } from "./data/charts";
import { useFavorites } from "./hooks/useFavorites";
import { useLens } from "./hooks/useLens";
import { useRecent } from "./hooks/useRecent";
import { useViewMode } from "./hooks/useViewMode";
import { matchesLens } from "./lib/catalog";
import { buildSections } from "./lib/sections";

export default function BrowseCharts() {
  const [lens, setLens] = useLens();
  const { viewMode, setViewMode, showDetail, setShowDetail, columns, setColumns } = useViewMode();
  const { favorites, isFavorite, toggle, isLoading } = useFavorites();
  const { recent, record, clear, isLoading: isLoadingRecent } = useRecent();

  const sections = useMemo(() => {
    const visible = CHARTS.filter((chart) => matchesLens(chart, lens));
    return buildSections(visible, favorites, recent);
  }, [lens, favorites, recent]);

  const browseProps = {
    sections,
    isLoading: isLoading || isLoadingRecent,
    isFavorite,
    onToggleFavorite: toggle,
    onUse: record,
    onClearRecent: recent.length > 0 ? clear : undefined,
    lens,
    onLensChange: setLens,
    viewMode,
    onViewModeChange: setViewMode,
    showDetail,
    onToggleDetail: () => setShowDetail(!showDetail),
    columns,
    onColumnsChange: setColumns,
  };

  return viewMode === "grid" ? <ChartGrid {...browseProps} /> : <ChartList {...browseProps} />;
}
