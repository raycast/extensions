import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { accountLabel } from "../format";
import { MercuryLogin } from "../logins";
import { Card, getAccounts, getCards, getCreditAccounts, log, toError } from "../mercury";
import { FailureRows, LoginErrorView } from "./ErrorViews";
import { TransactionList } from "./TransactionList";

const STATUS_ICONS: Record<Card["status"], Image.ImageLike> = {
  active: { source: Icon.CheckCircle, tintColor: Color.Green },
  frozen: { source: Icon.Snowflake, tintColor: Color.Blue },
  inactive: { source: Icon.Circle, tintColor: Color.SecondaryText },
  suspended: { source: Icon.Lock, tintColor: Color.Orange },
  expired: { source: Icon.Clock, tintColor: Color.SecondaryText },
  cancelled: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

const INTERVALS: Record<string, string> = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };

interface LoadedCard extends Card {
  login: MercuryLogin;
}

async function loadCards(logins: MercuryLogin[]) {
  const cards: LoadedCard[] = [];
  const accountNames = new Map<string, string>();
  const failures: Array<{ login: MercuryLogin; error: Error }> = [];
  await Promise.all(
    logins.map(async (login) => {
      try {
        // Credit cards belong to credit accounts, which /accounts does not list (business only).
        const [loginCards, accounts, credit] = await Promise.all([
          getCards(login.token),
          getAccounts(login.token),
          getCreditAccounts(login.token),
        ]);
        cards.push(...loginCards.map((card) => ({ ...card, login })));
        for (const account of accounts) accountNames.set(account.id, accountLabel(account));
        for (const account of credit) accountNames.set(account.id, "Mercury Credit");
      } catch (error) {
        const failure = toError(error);
        log.error("Couldn't load cards", { login: login.name, reason: failure.message });
        failures.push({ login, error: failure });
      }
    }),
  );
  return { cards, accountNames, failures };
}

export function CardList({
  logins,
  accountId,
  onLoginsChanged,
}: {
  logins: MercuryLogin[];
  accountId?: string;
  onLoginsChanged?: () => void;
}) {
  const [status, setStatus] = useCachedState("card-status-filter", "active");
  const { data, isLoading, revalidate } = usePromise(
    // The key drives refetching; tokens stay in the closure, never in hook arguments.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_key: string) => loadCards(logins),
    // In memory only (usePromise does not persist its arguments); the token makes an updated token refetch.
    [logins.map((login) => `${login.id}:${login.token}`).join(",")],
    { onError: () => {} },
  );

  const cards = (data?.cards ?? []).filter(
    (card) => (status === "all" || card.status === status) && (!accountId || card.accountId === accountId),
  );
  const byAccount = new Map<string, LoadedCard[]>();
  for (const card of cards) byAccount.set(card.accountId, [...(byAccount.get(card.accountId) ?? []), card]);
  const failure = data?.failures[0];
  const updated = () => (onLoginsChanged ? onLoginsChanged() : revalidate());

  return (
    <List
      isLoading={isLoading}
      navigationTitle={accountId ? `Cards · ${data?.accountNames.get(accountId) ?? ""}` : undefined}
      searchBarPlaceholder="Search cards…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Card Status" value={status} onChange={setStatus}>
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Frozen" value="frozen" />
          <List.Dropdown.Item title="Inactive" value="inactive" />
          <List.Dropdown.Item title="Suspended" value="suspended" />
          <List.Dropdown.Item title="Expired" value="expired" />
          <List.Dropdown.Item title="Cancelled" value="cancelled" />
          <List.Dropdown.Item title="All Cards" value="all" />
        </List.Dropdown>
      }
    >
      {!isLoading && cards.length === 0 && (data?.failures.length ?? 0) > 1 && (
        <FailureRows failures={data?.failures ?? []} onRetry={revalidate} onUpdated={updated} />
      )}
      {!isLoading && cards.length === 0 && data?.failures.length === 1 && failure && (
        <LoginErrorView login={failure.login} error={failure.error} onRetry={revalidate} onUpdated={updated} />
      )}
      {!isLoading && cards.length === 0 && !failure && (
        <List.EmptyView
          icon={Icon.CreditCard}
          title={status === "all" ? "No cards on this account" : `No ${status} cards`}
          description={status === "all" ? undefined : "Switch the filter to All Cards to see the rest."}
        />
      )}
      {cards.length > 0 && <FailureRows failures={data?.failures ?? []} onRetry={revalidate} onUpdated={updated} />}
      {[...byAccount].map(([id, accountCards]) => (
        <List.Section
          key={id}
          title={data?.accountNames.get(id) ?? "Other Account"}
          subtitle={[
            logins.length > 1 ? accountCards[0].login.name : undefined,
            `${accountCards.length} ${accountCards.length === 1 ? "card" : "cards"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {accountCards.map((card) => (
            <CardListItem key={card.id} card={card} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function CardListItem({ card }: { card: LoadedCard }) {
  const status = card.status.charAt(0).toUpperCase() + card.status.slice(1);
  const expiration = `${String(card.expiration.month).padStart(2, "0")}/${String(card.expiration.year).slice(-2)}`;
  const limit = card.spendLimit
    ? `${formatCents(card.spendLimit.amountCents)}/${INTERVALS[card.spendLimit.interval] ?? card.spendLimit.interval}`
    : undefined;
  const isCredit = card.kind === "credit";

  return (
    <List.Item
      icon={{ source: Icon.CreditCard, tintColor: isCredit ? Color.Purple : Color.Blue }}
      title={card.nickname || card.nameOnCard}
      subtitle={`•• ${card.lastFour}`}
      keywords={[card.lastFour, card.nameOnCard, card.kind, card.type]}
      accessories={[
        ...(limit ? [{ text: limit, tooltip: "Spend limit" }] : []),
        { text: `Exp ${expiration}`, tooltip: "Expiration" },
        { tag: card.type === "virtual" ? "Virtual" : "Physical" },
        { tag: { value: isCredit ? "Credit" : "Debit", color: isCredit ? Color.Purple : Color.Blue } },
        { icon: STATUS_ICONS[card.status], tooltip: status },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Transactions"
            icon={Icon.List}
            target={<TransactionList scope={{ kind: "card", login: card.login, card }} />}
          />
          <Action.CopyToClipboard
            title="Copy Last Four Digits"
            content={card.lastFour}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Name on Card"
            content={card.nameOnCard}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
