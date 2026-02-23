import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { SearchResult } from "../interface/search-result";
import {
  formatHoursFromMinutes,
  formatWatchTimeCompact,
  formatWatchTimeDetailed,
  getTotalMinutes,
} from "../utils/watch-time";

const FALLBACK_POSTER_URL = "https://placehold.co/960x540/png?text=No+Poster";

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

export function SearchResultListItem(props: { result: SearchResult }) {
  const { result } = props;
  const { id, title, url, image, type, watchTime, episodeCount, runtimeMinutes } = result;
  const posterSource = image ?? FALLBACK_POSTER_URL;

  const totalMinutes = getTotalMinutes(watchTime);
  const compactTime = formatWatchTimeCompact(watchTime);
  const detailedTime = formatWatchTimeDetailed(watchTime);
  const yearLabel = formatYearLabel(result);

  const detailMarkdown = [
    `![](${posterSource})`,
    "",
    `# ${title}`,
    "",
    `**Type:** ${formatTypeLabel(type)}`,
    ...(yearLabel ? [`**Release:** ${yearLabel}`] : []),
    ...(type === "show" && episodeCount ? [`**Episodes:** ${episodeCount.toLocaleString()}`] : []),
    ...(runtimeMinutes ? [`**Runtime (source):** ${runtimeMinutes.toLocaleString()} min`] : []),
    "",
    "## Total Binge Time",
    detailedTime,
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
      title={title}
      icon={{ source: posterSource }}
      accessories={[...(yearLabel ? [{ text: yearLabel }] : []), { text: compactTime }]}
      detail={<List.Item.Detail markdown={detailMarkdown} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" icon={{ source: Icon.Globe }} url={url} />
          <Action.CopyToClipboard
            title="Copy Watch Time"
            icon={{ source: Icon.Clock }}
            content={`${title}: ${detailedTime}`}
            shortcut={{
              modifiers: ["cmd"],
              key: "t",
            }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            icon={{ source: Icon.Clipboard }}
            content={url}
            shortcut={{
              modifiers: ["cmd"],
              key: "c",
            }}
          />
        </ActionPanel>
      }
    />
  );
}
