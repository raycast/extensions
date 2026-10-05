import { Action, ActionPanel, Color, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { classifyDirection, parseAmount, stripHtml } from "../lib/classify";
import { formatMoney, relativeTime } from "../lib/format";
import { WiseActivity } from "../lib/types";
import { ActivityDetail } from "./ActivityDetail";

interface Props {
  activity: WiseActivity;
  numberFormat: string;
  onRefresh?: () => void;
}

const STATUS_ICONS: Record<string, { source: Icon; tintColor: Color }> = {
  COMPLETED: { source: Icon.CheckCircle, tintColor: Color.Green },
  PENDING: { source: Icon.Clock, tintColor: Color.Yellow },
  CANCELLED: { source: Icon.XMarkCircle, tintColor: Color.Red },
  REJECTED: { source: Icon.XMarkCircle, tintColor: Color.Red },
  REFUNDED: { source: Icon.ArrowCounterClockwise, tintColor: Color.Blue },
};

export function ActivityListItem({ activity, numberFormat, onRefresh }: Props) {
  const direction = classifyDirection(activity);
  const primary = parseAmount(activity.primaryAmount);
  const secondary = parseAmount(activity.secondaryAmount);
  const title = stripHtml(activity.title) || activity.type;

  const sign = direction === "out" ? "-" : direction === "in" ? "+" : "";
  const amountStr = primary
    ? `${sign}${formatMoney(primary.value, primary.currency, numberFormat)}`
    : activity.primaryAmount;

  const amountColor = direction === "out" ? Color.Red : direction === "in" ? Color.Green : Color.PrimaryText;

  const accessories: List.Item.Accessory[] = [];
  if (secondary && secondary.currency !== primary?.currency) {
    accessories.push({ text: `≈ ${formatMoney(secondary.value, secondary.currency, numberFormat)}` });
  }
  accessories.push({ tag: { value: amountStr, color: amountColor } });
  accessories.push({
    date: new Date(activity.createdOn),
    tooltip: relativeTime(new Date(activity.createdOn).getTime()),
  });

  return (
    <List.Item
      title={title}
      subtitle={stripHtml(activity.description)}
      icon={STATUS_ICONS[activity.status] ?? { source: Icon.Circle, tintColor: Color.SecondaryText }}
      accessories={accessories}
      keywords={[
        activity.type,
        activity.status,
        stripHtml(activity.description),
        stripHtml(activity.primaryAmount),
        primary?.currency ?? "",
      ].filter(Boolean)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<ActivityDetail activity={activity} numberFormat={numberFormat} />}
          />
          <Action.CopyToClipboard title="Copy Amount" content={amountStr} />
          <Action
            title="Show All Transactions"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => launchCommand({ name: "transactions", type: LaunchType.UserInitiated })}
          />
          {onRefresh && (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
