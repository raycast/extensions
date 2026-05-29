import { Color, List } from "@raycast/api";
import { classifyDirection, parseAmount, stripHtml } from "../lib/classify";
import { formatDate, formatMoney } from "../lib/format";
import { WiseActivity } from "../lib/types";

interface Props {
  activity: WiseActivity;
  numberFormat: string;
}

const STATUS_COLORS: Record<string, Color> = {
  COMPLETED: Color.Green,
  PENDING: Color.Yellow,
  CANCELLED: Color.Red,
  REJECTED: Color.Red,
  REFUNDED: Color.Blue,
};

const DIRECTION_COLORS: Record<string, Color> = {
  in: Color.Green,
  out: Color.Red,
  neutral: Color.SecondaryText,
};

export function ActivityItemDetail({ activity, numberFormat }: Props) {
  const direction = classifyDirection(activity);
  const title = stripHtml(activity.title) || activity.type;
  const description = stripHtml(activity.description);
  const primary = parseAmount(activity.primaryAmount);
  const secondary = parseAmount(activity.secondaryAmount);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Description" text={title} />
          {description && description !== title && (
            <List.Item.Detail.Metadata.Label title="Details" text={description} />
          )}
          <List.Item.Detail.Metadata.Label title="Type" text={activity.type} />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={activity.status}
              color={STATUS_COLORS[activity.status] ?? Color.SecondaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Direction">
            <List.Item.Detail.Metadata.TagList.Item text={direction} color={DIRECTION_COLORS[direction]} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          {primary && (
            <List.Item.Detail.Metadata.Label
              title="Amount"
              text={formatMoney(primary.value, primary.currency, numberFormat)}
            />
          )}
          {secondary && secondary.currency !== primary?.currency && (
            <List.Item.Detail.Metadata.Label
              title="Equivalent"
              text={formatMoney(secondary.value, secondary.currency, numberFormat)}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Date" text={formatDate(activity.createdOn)} />
          {activity.resource && (
            <List.Item.Detail.Metadata.Label
              title="Resource"
              text={`${activity.resource.type} #${activity.resource.id}`}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
