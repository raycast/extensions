import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { formatMoney } from "../lib/format";
import { BalanceWithDisplay } from "../lib/types";

interface SectionProps {
  title: string;
  subtitle?: string;
  icon: Icon;
  iconColor: Color;
  balances: BalanceWithDisplay[];
  locale: string;
  totalCurrency?: string;
  onRefresh: () => void;
}

export function BalancesSection({
  title,
  subtitle,
  icon,
  iconColor,
  balances,
  locale,
  totalCurrency,
  onRefresh,
}: SectionProps) {
  if (balances.length === 0) return null;
  const sorted = [...balances].sort((a, b) => {
    const ae = a.displayEquiv ?? a.amount.value;
    const be = b.displayEquiv ?? b.amount.value;
    return be - ae;
  });
  return (
    <List.Section title={title} subtitle={subtitle}>
      {sorted.map((b) => (
        <BalanceItem
          key={b.id}
          balance={b}
          locale={locale}
          onRefresh={onRefresh}
          totalCurrency={totalCurrency}
          icon={icon}
          iconColor={iconColor}
        />
      ))}
    </List.Section>
  );
}

function BalanceItem({
  balance,
  locale,
  onRefresh,
  totalCurrency,
  icon,
  iconColor,
}: {
  balance: BalanceWithDisplay;
  locale: string;
  onRefresh: () => void;
  totalCurrency?: string;
  icon: Icon;
  iconColor: Color;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (balance.displayEquiv != null && totalCurrency && balance.currency !== totalCurrency) {
    accessories.push({ text: `≈ ${formatMoney(balance.displayEquiv, totalCurrency, locale)}` });
  }
  accessories.push({ tag: { value: balance.currency, color: Color.Blue } });

  const title = formatMoney(balance.amount.value, balance.currency, locale);
  const subtitle = balance.name ?? undefined;

  return (
    <List.Item
      icon={{ source: icon, tintColor: iconColor }}
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      keywords={[balance.currency, balance.type, balance.name ?? ""].filter(Boolean)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Balance" content={title} />
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
