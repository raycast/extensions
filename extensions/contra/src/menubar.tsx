import {
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { logout } from "./lib/oauth";
import {
  computeEarnings,
  daysUntil,
  formatDate,
  formatMoney,
  formatUSD,
  getWallet,
  listAllInvoicesSent,
  listConversations,
  OUTSTANDING_STATUSES,
} from "./lib/contra";

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const [wallet, outstanding, chat] = await Promise.all([
      getWallet(),
      listAllInvoicesSent(OUTSTANDING_STATUSES),
      listConversations(),
    ]);
    outstanding.sort((a, b) =>
      (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
    );
    return {
      wallet,
      earnings: computeEarnings(wallet.transactions),
      outstanding,
      totalUnread: chat.totalUnread,
    };
  }, []);

  const pending = data?.wallet.balance.pending;
  const outstanding = data?.outstanding ?? [];
  const pastDue = outstanding.filter((i) => i.isPastDue);
  const nextDue = outstanding.find((i) => !i.isPastDue) ?? outstanding[0];
  const unread = data?.totalUnread ?? 0;

  // Title prioritizes attention-grabbers: unread > past due > pending balance.
  const title =
    unread > 0
      ? `${unread} ✉︎`
      : pastDue.length > 0
        ? `${pastDue.length} overdue`
        : pending
          ? formatMoney(pending)
          : undefined;
  const needsAttention = unread > 0 || pastDue.length > 0;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: Icon.Coins,
        tintColor: needsAttention ? Color.Red : Color.PrimaryText,
      }}
      title={title}
      tooltip="Contra"
    >
      <MenuBarExtra.Section title="Earnings">
        <MenuBarExtra.Item
          title="This Month"
          subtitle={data ? formatUSD(data.earnings.thisMonth) : "—"}
        />
        <MenuBarExtra.Item
          title="This Week"
          subtitle={data ? formatUSD(data.earnings.thisWeek) : "—"}
        />
        <MenuBarExtra.Item
          title="Lifetime"
          subtitle={data ? formatUSD(data.earnings.lifetime) : "—"}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Wallet">
        <MenuBarExtra.Item
          title="Available"
          subtitle={formatMoney(data?.wallet.balance.available)}
        />
        <MenuBarExtra.Item title="Pending" subtitle={formatMoney(pending)} />
      </MenuBarExtra.Section>

      {unread > 0 && (
        <MenuBarExtra.Section title={`Unread Messages (${unread})`}>
          <MenuBarExtra.Item
            icon={{ source: Icon.SpeechBubble, tintColor: Color.Red }}
            title="Open Messages"
            onAction={() =>
              launchCommand({
                name: "messages",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </MenuBarExtra.Section>
      )}

      {pastDue.length > 0 && (
        <MenuBarExtra.Section title={`Past Due (${pastDue.length})`}>
          {pastDue.slice(0, 5).map((inv) => (
            <MenuBarExtra.Item
              key={inv.id}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title={`${inv.totalAmount} · ${inv.clientName ?? inv.invoiceNumber}`}
              subtitle={`due ${formatDate(inv.dueDate)}`}
              onAction={() => open(inv.invoiceUrl)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Next Due">
        {nextDue ? (
          <MenuBarExtra.Item
            icon={Icon.Document}
            title={`${nextDue.totalAmount} · ${nextDue.clientName ?? nextDue.invoiceNumber}`}
            subtitle={dueLabel(nextDue.dueDate)}
            onAction={() => open(nextDue.invoiceUrl)}
          />
        ) : (
          <MenuBarExtra.Item title="No outstanding invoices 🎉" />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Finance Dashboard"
          icon={Icon.BankNote}
          onAction={() =>
            launchCommand({ name: "finance", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Open Contra"
          icon={Icon.Globe}
          onAction={() => open("https://contra.com/independent/home")}
        />
        <MenuBarExtra.Item
          title="Preferences"
          icon={Icon.Gear}
          onAction={openCommandPreferences}
        />
        <MenuBarExtra.Item
          title="Log Out"
          icon={Icon.Logout}
          onAction={async () => {
            await logout();
            await showHUD("Signed out of Contra");
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function dueLabel(date: string | null): string {
  const d = daysUntil(date);
  if (d === null) return formatDate(date);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "due today";
  return `due in ${d}d`;
}
