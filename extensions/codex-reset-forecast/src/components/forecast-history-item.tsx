import { Color, Icon, List } from "@raycast/api";
import { historyDetailMarkdown, historySummary } from "../domain/forecast-copy";
import { formatRecordDate } from "../domain/format-forecast";
import { recordLabel, type HistoryItem } from "../domain/reset-history";
import { ForecastActions } from "./forecast-actions";

export function recordAppearance(record: HistoryItem) {
  switch (record.type) {
    case "reset":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "banked-reset":
      return { source: Icon.Wallet, tintColor: Color.Orange };
    case "announcement":
      return { source: Icon.Document, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Document, tintColor: Color.SecondaryText };
  }
}

export function ResetDetail({ record, timeZone }: { record: HistoryItem; timeZone?: string }) {
  return <List.Item.Detail markdown={historyDetailMarkdown(record, timeZone)} />;
}

export function ForecastHistoryItem({
  record,
  onRefresh,
  timeZone,
}: {
  record: HistoryItem;
  onRefresh: () => void;
  timeZone?: string;
}) {
  const visual = recordAppearance(record);
  return (
    <List.Item
      id={record.id}
      title={formatRecordDate(record.dateTime, timeZone)}
      icon={visual}
      keywords={[record.title, record.dateTime, record.description, record.sourceLabel ?? ""]}
      accessories={[
        {
          tag: {
            value: recordLabel(record),
            color: visual.tintColor,
          },
          tooltip: record.title,
        },
      ]}
      detail={<ResetDetail record={record} timeZone={timeZone} />}
      actions={
        <ForecastActions
          sourceUrl={record.sourceUrl}
          copyContent={historySummary(record, timeZone)}
          copyTitle="Copy Reset Record"
          onRefresh={onRefresh}
        />
      }
    />
  );
}
