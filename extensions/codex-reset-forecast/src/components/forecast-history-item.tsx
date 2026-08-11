import { Color, Detail, Icon, List } from "@raycast/api";
import type { ForecastHistoryEntry } from "../api/forecast-schema";
import { classifyHistoryEntry, getSourceDetail, historyTitle } from "../domain/classify-history";
import { historyDetailMarkdown } from "../domain/forecast-copy";
import { formatDateTime, scoreTransition } from "../domain/format-forecast";
import { ForecastActions } from "./forecast-actions";

type ForecastHistoryItemProps = {
  entry: ForecastHistoryEntry;
  isStale: boolean;
  onRefresh: () => void;
};

function appearance(kind: ReturnType<typeof classifyHistoryEntry>) {
  if (kind === "confirmed-reset") {
    return {
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tag: { value: "RESET", color: Color.Green },
    };
  }

  if (kind === "announcement") {
    return {
      icon: { source: Icon.Megaphone, tintColor: Color.Orange },
      tag: { value: "ANNOUNCED", color: Color.Orange },
    };
  }

  return {
    icon: { source: Icon.BarChart, tintColor: Color.SecondaryText },
    tag: undefined,
  };
}

export function ForecastHistoryItem({ entry, isStale, onRefresh }: ForecastHistoryItemProps) {
  const kind = classifyHistoryEntry(entry);
  const source = getSourceDetail(entry);
  const visual = appearance(kind);
  const markdown = historyDetailMarkdown(entry);
  const copyContent = source?.name ?? markdown;
  const copyTitle = source?.name ? "Copy Source Post" : "Copy Forecast Change";
  const accessories: List.Item.Accessory[] = [];

  if (isStale) accessories.push({ tag: { value: "STALE", color: Color.Yellow } });
  if (visual.tag) accessories.push({ tag: visual.tag });
  accessories.push({ text: scoreTransition(entry.fromScore, entry.toScore) });
  accessories.push({ date: new Date(entry.at) });
  const detail = (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Score" text={scoreTransition(entry.fromScore, entry.toScore)} />
          <Detail.Metadata.Label
            title="Total Change"
            text={`${entry.scoreDelta > 0 ? "+" : ""}${entry.scoreDelta} pts`}
          />
          <Detail.Metadata.Label title="Updated" text={formatDateTime(entry.at)} />
          {source?.url ? <Detail.Metadata.Link title="Source" text="Open Source Post" target={source.url} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ForecastActions
          sourceUrl={source?.url}
          copyContent={copyContent}
          copyTitle={copyTitle}
          onRefresh={onRefresh}
        />
      }
    />
  );

  return (
    <List.Item
      icon={visual.icon}
      title={historyTitle(entry)}
      subtitle={formatDateTime(entry.at)}
      accessories={accessories}
      actions={
        <ForecastActions
          detail={detail}
          sourceUrl={source?.url}
          copyContent={copyContent}
          copyTitle={copyTitle}
          onRefresh={onRefresh}
        />
      }
    />
  );
}
