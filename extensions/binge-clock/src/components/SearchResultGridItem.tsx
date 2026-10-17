import { ActionPanel, Icon, Grid } from "@raycast/api";
import { SearchResult } from "../interface/search-result";
import { formatWatchTimeCompact, formatWatchTimeDetailed } from "../utils/watch-time";
import { CopyUrlAction, CopyWatchTimeAction, OpenInBrowserAction, ToggleLayoutAction } from "./Actions";

function formatYearLabel(result: SearchResult): string | null {
  const fromYear = result.fromYear ?? result.year;
  const toYear = result.toYear ?? result.year;

  if (!fromYear && !toYear) {
    return null;
  }

  if (fromYear && toYear && fromYear !== toYear) {
    return `${fromYear}-${toYear}`;
  }

  return `${fromYear ?? toYear}`;
}

export function SearchResultGridItem(props: { result: SearchResult; layout: string; onToggleLayout: () => void }) {
  const { result, layout, onToggleLayout } = props;
  const { id, title, url, image, type, watchTime } = result;

  const compactTime = formatWatchTimeCompact(watchTime);
  const detailedTime = formatWatchTimeDetailed(watchTime);
  const yearLabel = formatYearLabel(result);

  return (
    <Grid.Item
      id={id}
      title={title}
      subtitle={yearLabel ? `${yearLabel} · ${compactTime}` : compactTime}
      content={{ source: image ?? "", fallback: type === "show" ? Icon.Play : Icon.FilmStrip }}
      accessory={{
        icon: type === "show" ? Icon.Play : Icon.FilmStrip,
        tooltip: type === "show" ? "TV Show" : "Movie",
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction url={url} />
            <CopyWatchTimeAction title={title} detailedTime={detailedTime} />
            <CopyUrlAction url={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ToggleLayoutAction layout={layout} onToggleLayout={onToggleLayout} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
