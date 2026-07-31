import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { formatMoney } from "../lib/format";

interface Props {
  title: string;
  amount: number;
  currency: string;
  numberFormat: string;
  icon: Icon;
  onRefresh: () => void;
}

export function SummaryItem({ title, amount, currency, numberFormat, icon, onRefresh }: Props) {
  const amountStr = formatMoney(amount, currency, numberFormat);
  return (
    <List.Item
      icon={{ source: icon, tintColor: Color.Orange }}
      title={title}
      accessories={[{ tag: { value: amountStr, color: Color.Red } }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Amount" content={amountStr} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
