import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  computeEarnings,
  formatDate,
  formatMoney,
  formatUSD,
  getWallet,
  Invoice,
  InvoiceStatus,
  listAllInvoicesSent,
  OUTSTANDING_STATUSES,
  parseFormattedAmount,
} from "./lib/contra";

const STATUS_TINT: Record<InvoiceStatus, Color> = {
  PAID: Color.Green,
  UNPAID: Color.Yellow,
  PAST_DUE: Color.Red,
  SCHEDULED: Color.Blue,
  PENDING_APPROVAL: Color.Orange,
  CANCELLED: Color.SecondaryText,
  REJECTED: Color.Red,
  REFUNDED: Color.Purple,
  PARTIALLY_REFUNDED: Color.Purple,
};

export default function Command() {
  const [txLimit, setTxLimit] = useState(25);

  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const [wallet, outstanding] = await Promise.all([
        getWallet(),
        listAllInvoicesSent(OUTSTANDING_STATUSES),
      ]);
      return { wallet, outstanding };
    },
    [],
    {
      onError: (e) => {
        showFailureToast(e, { title: "Failed to load Contra finances" });
      },
    },
  );

  const balance = data?.wallet.balance;
  const transactions = data?.wallet.transactions ?? [];
  const outstanding = data?.outstanding ?? [];

  const earnings = computeEarnings(transactions);
  const pastDue = outstanding.filter((i) => i.isPastDue);
  const outstandingTotal = outstanding.reduce(
    (sum, i) => sum + parseFormattedAmount(i.totalAmount),
    0,
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Contra Finances"
      pagination={{
        pageSize: 25,
        onLoadMore: () => setTxLimit((n) => n + 25),
        hasMore: txLimit < transactions.length,
      }}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Earnings (wallet income)">
        <Stat
          icon={Icon.Sun}
          title="Today"
          value={formatUSD(earnings.today)}
          color={Color.Green}
        />
        <Stat
          icon={Icon.Calendar}
          title="This Week"
          value={formatUSD(earnings.thisWeek)}
          color={Color.Green}
        />
        <Stat
          icon={Icon.Calendar}
          title="This Month"
          value={formatUSD(earnings.thisMonth)}
          color={Color.Green}
        />
        <Stat
          icon={Icon.Calendar}
          title="Previous Month"
          value={formatUSD(earnings.prevMonth)}
          color={Color.SecondaryText}
        />
        <Stat
          icon={Icon.Trophy}
          title="Lifetime"
          value={formatUSD(earnings.lifetime)}
          color={Color.Yellow}
        />
      </List.Section>

      <List.Section title="Wallet">
        <Stat
          icon={Icon.BankNote}
          title="Available Balance"
          value={formatMoney(balance?.available)}
          color={Color.Green}
        />
        <Stat
          icon={Icon.Clock}
          title="Pending"
          value={formatMoney(balance?.pending)}
          color={Color.Yellow}
        />
        <Stat
          icon={Icon.Lock}
          title="In Escrow"
          value={formatMoney(balance?.escrow)}
          color={Color.Blue}
        />
        <Stat
          icon={Icon.Receipt}
          title="Outstanding"
          value={formatUSD(outstandingTotal)}
          subtitle={`${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}`}
          color={Color.Orange}
        />
      </List.Section>

      {pastDue.length > 0 && (
        <List.Section title="⚠️ Past Due" subtitle={`${pastDue.length}`}>
          {pastDue.map((inv) => (
            <InvoiceItem key={inv.id} invoice={inv} onChange={revalidate} />
          ))}
        </List.Section>
      )}

      <List.Section
        title="Outstanding Invoices"
        subtitle={`${outstanding.filter((i) => !i.isPastDue).length}`}
      >
        {outstanding
          .filter((i) => !i.isPastDue)
          .map((inv) => (
            <InvoiceItem key={inv.id} invoice={inv} onChange={revalidate} />
          ))}
      </List.Section>

      <List.Section title="Recent Transactions">
        {transactions.slice(0, txLimit).map((t) => (
          <List.Item
            key={t.id}
            icon={{
              source: Icon.Coins,
              tintColor:
                t.statusLabel === "SUCCEEDED"
                  ? Color.Green
                  : Color.SecondaryText,
            }}
            title={t.description}
            subtitle={t.statusLabel}
            accessories={[
              { text: formatMoney(t.amount) },
              { date: new Date(t.transactionTime) },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function Stat(props: {
  icon: Icon;
  title: string;
  value: string;
  subtitle?: string;
  color?: Color;
}) {
  return (
    <List.Item
      icon={{ source: props.icon, tintColor: props.color }}
      title={props.title}
      subtitle={props.subtitle}
      accessories={[{ tag: { value: props.value, color: props.color } }]}
    />
  );
}

function InvoiceItem({
  invoice,
  onChange,
}: {
  invoice: Invoice;
  onChange: () => void;
}) {
  return (
    <List.Item
      icon={{
        source: Icon.Document,
        tintColor: STATUS_TINT[invoice.status] ?? Color.PrimaryText,
      }}
      title={invoice.title ?? `Invoice ${invoice.invoiceNumber}`}
      subtitle={invoice.clientName ?? undefined}
      accessories={[
        { tag: { value: invoice.status, color: STATUS_TINT[invoice.status] } },
        { text: invoice.totalAmount },
        {
          date: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
          tooltip: `Due ${formatDate(invoice.dueDate)}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={invoice.invoiceUrl} title="Open Invoice" />
          <Action.CopyToClipboard
            title="Copy Invoice Link"
            content={invoice.invoiceUrl}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onChange}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
