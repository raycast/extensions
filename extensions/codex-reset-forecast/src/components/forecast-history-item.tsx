import { Color, Icon, List } from "@raycast/api";
import { historyDetailMarkdown, historySummary, sourceText } from "../domain/forecast-copy";
import { formatRecordDate } from "../domain/format-forecast";
import { recordLabel, type HistoryItem } from "../domain/reset-history";
import { ForecastActions } from "./forecast-actions";

export function recordAppearance(record: HistoryItem) {
  switch (record.type) {
    case "forced-reset":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "compensation":
      return { source: Icon.Gift, tintColor: Color.Green };
    case "banked-reset":
      return { source: Icon.Wallet, tintColor: Color.Purple };
    case "announcement":
      return { source: Icon.Megaphone, tintColor: Color.Orange };
    default:
      return { source: Icon.Document, tintColor: Color.SecondaryText };
  }
}

export function ResetDetail({ record }: { record: HistoryItem }) {
  return <List.Item.Detail markdown={historyDetailMarkdown(record)} />;
}

export function ForecastHistoryItem({ record, onRefresh }: { record: HistoryItem; onRefresh: () => void }) {
  const visual = recordAppearance(record);
  return (
    <List.Item
      id={record.id}
      title={formatRecordDate(record.dateTime)}
      icon={visual}
      keywords={[
        record.title,
        record.dateTime,
        record.description,
        record.scope ?? "",
        record.sourceLabel ?? "",
        record.evidence?.author ?? "",
        record.evidence?.handle ?? "",
        sourceText(record.evidence?.summary ?? ""),
      ]}
      accessories={[
        {
          tag: {
            value:
              record.type === "forced-reset"
                ? "Reset"
                : record.type === "banked-reset"
                  ? "Banked"
                  : record.type === "announcement"
                    ? "Announced"
                    : recordLabel(record),
            color: visual.tintColor,
          },
          tooltip: record.title,
        },
      ]}
      detail={<ResetDetail record={record} />}
      actions={
        <ForecastActions
          sourceUrl={record.sourceUrl}
          copyContent={historySummary(record)}
          copyTitle="Copy Reset Record"
          onRefresh={onRefresh}
        />
      }
    />
  );
}
