import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { classifyDirection, parseAmount, stripHtml } from "../lib/classify";
import { formatDate, formatMoney } from "../lib/format";
import { WiseActivity } from "../lib/types";

interface Props {
  activity: WiseActivity;
  locale: string;
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

export function ActivityDetail({ activity, locale }: Props) {
  const direction = classifyDirection(activity);
  const title = stripHtml(activity.title) || activity.type;
  const description = stripHtml(activity.description);
  const primary = parseAmount(activity.primaryAmount);
  const secondary = parseAmount(activity.secondaryAmount);

  const sign = direction === "out" ? "-" : direction === "in" ? "+" : "";
  const amountStr = primary ? `${sign}${formatMoney(primary.value, primary.currency, locale)}` : activity.primaryAmount;

  const markdown = [
    `# ${title}`,
    description ? `\n> ${description}` : "",
    "",
    `## ${amountStr}`,
    "",
    `*${formatDate(activity.createdOn, locale)}*`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={activity.type} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={activity.status}
              color={STATUS_COLORS[activity.status] ?? Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Direction">
            <Detail.Metadata.TagList.Item text={direction} color={DIRECTION_COLORS[direction]} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {primary && (
            <Detail.Metadata.Label title="Amount" text={formatMoney(primary.value, primary.currency, locale)} />
          )}
          {secondary && secondary.currency !== primary?.currency && (
            <Detail.Metadata.Label title="Equivalent" text={formatMoney(secondary.value, secondary.currency, locale)} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Date" text={formatDate(activity.createdOn, locale)} />
          {activity.resource && (
            <Detail.Metadata.Label title="Resource" text={`${activity.resource.type} #${activity.resource.id}`} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Amount" content={amountStr} />
          <Action.CopyToClipboard title="Copy Title" content={title} />
          <Action.OpenInBrowser title="Open Wise.com" url="https://wise.com/all-transactions" />
        </ActionPanel>
      }
    />
  );
}
