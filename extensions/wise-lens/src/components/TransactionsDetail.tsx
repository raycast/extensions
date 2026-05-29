import { Color, Icon, List } from "@raycast/api";
import { classifyDirection } from "../lib/classify";
import { formatMoney } from "../lib/format";
import { DashboardSnapshot } from "../lib/types";

interface Props {
  snapshot: DashboardSnapshot;
  numberFormat: string;
  summaryCurrency: string;
}

export function TransactionsDetail({ snapshot, numberFormat, summaryCurrency }: Props) {
  const { activities, summary } = snapshot;
  const completed = activities.filter((a) => a.status === "COMPLETED").length;
  const pending = activities.filter((a) => a.status === "PENDING").length;
  const incoming = activities.filter((a) => classifyDirection(a) === "in").length;
  const outgoing = activities.filter((a) => classifyDirection(a) === "out").length;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Loaded" text={String(activities.length)} icon={Icon.List} />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={`${completed} completed`} color={Color.Green} />
            {pending > 0 && <List.Item.Detail.Metadata.TagList.Item text={`${pending} pending`} color={Color.Yellow} />}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Direction">
            <List.Item.Detail.Metadata.TagList.Item text={`${incoming} incoming`} color={Color.Green} />
            <List.Item.Detail.Metadata.TagList.Item text={`${outgoing} outgoing`} color={Color.Red} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Spent this month"
            text={formatMoney(summary.spentMonth, summaryCurrency, numberFormat)}
          />
          <List.Item.Detail.Metadata.Label
            title="Spent in last 30 days"
            text={formatMoney(summary.spent30, summaryCurrency, numberFormat)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
