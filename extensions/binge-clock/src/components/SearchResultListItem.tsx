import { List, ActionPanel, Icon } from "@raycast/api";
import { SearchResult } from "../interface/search-result";
import {
  formatHoursFromMinutes,
  formatWatchTimeCompact,
  formatWatchTimeDetailed,
  getTotalMinutes,
} from "../utils/watch-time";
import {
  CopyUrlAction,
  CopyWatchTimeAction,
  OpenInBrowserAction,
  ToggleDetailAction,
  ToggleLayoutAction,
} from "./Actions";

function formatTypeLabel(type: SearchResult["type"]): string {
  return type === "show" ? "TV Show" : "Movie";
}

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

export function SearchResultListItem(props: {
  result: SearchResult;
  isShowingDetail: boolean;
  setIsShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
  layout: string;
  onToggleLayout: () => void;
}) {
  const { result, isShowingDetail, setIsShowingDetail, layout, onToggleLayout } = props;
  const { id, title, url, image, type, watchTime, episodeCount, runtimeMinutes } = result;

  const totalMinutes = getTotalMinutes(watchTime);
  const compactTime = formatWatchTimeCompact(watchTime);
  const detailedTime = formatWatchTimeDetailed(watchTime);
  const yearLabel = formatYearLabel(result);

  const detailMarkdown = [
    image ? `![](${image})` : "",
    "",
    `# ${title}`,
    "",
    `> ${detailedTime}`,
    "",
    `**Type:** ${formatTypeLabel(type)}`,
    ...(yearLabel ? [`\n**Release:** ${yearLabel}`] : []),
    ...(type === "show" && episodeCount ? [`\n**Episodes:** ${episodeCount.toLocaleString()}`] : []),
    ...(runtimeMinutes ? [`\n**Runtime (source):** ${runtimeMinutes.toLocaleString()} min`] : []),
    "",
    "## Breakdown",
    `- Days: ${watchTime.days ?? 0}`,
    `- Hours: ${watchTime.hours ?? 0}`,
    `- Minutes: ${watchTime.minutes ?? 0}`,
    "",
    "## Converted",
    `- Total minutes: ${totalMinutes.toLocaleString()} min`,
    `- Total hours: ${formatHoursFromMinutes(totalMinutes)} h`,
  ].join("\n");

  return (
    <List.Item
      id={id}
      title={{ value: title, tooltip: title }}
      subtitle={isShowingDetail ? undefined : compactTime}
      icon={{ source: image ?? "", fallback: type === "show" ? Icon.Play : Icon.FilmStrip }}
      accessories={[
        ...(yearLabel
          ? [
              { text: yearLabel },
              ...(isShowingDetail
                ? []
                : [
                    {
                      icon: type === "show" ? Icon.Play : Icon.FilmStrip,
                      tooltip: type === "show" ? "TV Show" : "Movie",
                    },
                  ]),
            ]
          : []),
      ]}
      detail={<List.Item.Detail markdown={detailMarkdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction url={url} />
            <CopyWatchTimeAction title={title} detailedTime={detailedTime} />
            <CopyUrlAction url={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ToggleDetailAction isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
            <ToggleLayoutAction layout={layout} onToggleLayout={onToggleLayout} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
