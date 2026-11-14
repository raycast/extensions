import { environment, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, type ReactNode } from "react";
import "./hooks/locale";
import { T212ErrorEmptyView } from "./components/error-view";
import { TransactionItems } from "./components/history-deposits";
import { DividendItems } from "./components/history-dividends";
import { OrderItems } from "./components/history-orders";
import { useHistory, type HistoryKind } from "./hooks/useHistory";
import { usePortfolio } from "./hooks/usePortfolio";

const VIEWS: { kind: HistoryKind; title: string; placeholder: string; empty: string; icon: Icon }[] = [
  {
    kind: "dividends",
    title: "Dividends",
    placeholder: "Search dividends…",
    empty: "No dividends yet",
    icon: Icon.Coins,
  },
  { kind: "orders", title: "Orders", placeholder: "Search orders…", empty: "No orders yet", icon: Icon.List },
  {
    kind: "transactions",
    title: "Deposits & Withdrawals",
    placeholder: "Search deposits…",
    empty: "No deposits yet",
    icon: Icon.BankNote,
  },
];

function ViewDropdown({ value, onChange }: { value: HistoryKind; onChange: (kind: HistoryKind) => void }) {
  return (
    <List.Dropdown
      tooltip="History"
      value={value}
      onChange={(v) => onChange(VIEWS.find((view) => view.kind === v)?.kind ?? "dividends")}
    >
      {VIEWS.map((view) => (
        <List.Dropdown.Item key={view.kind} title={view.title} value={view.kind} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [storedKind, setKind] = useCachedState<HistoryKind>("history-view", "dividends");
  const view = VIEWS.find((v) => v.kind === storedKind) ?? VIEWS[0];
  // Only the selected kind syncs: each /history/* endpoint allows 20 requests a minute.
  const dividends = useHistory("dividends", { execute: view.kind === "dividends" });
  const orders = useHistory("orders", { execute: view.kind === "orders" });
  const transactions = useHistory("transactions", { execute: view.kind === "transactions" });
  const active = { dividends, orders, transactions }[view.kind];
  // Portfolio only enriches History (prices, total value, "Show in Portfolio"); never block on it.
  const { view: portfolio } = usePortfolio({ toastOnError: false });
  const appearance = environment.appearance;

  const currentPrices = useMemo(
    () =>
      Object.fromEntries(
        (portfolio?.positions ?? []).map((p) => [p.ticker, { price: p.currentPrice, currency: p.priceCurrency }]),
      ),
    [portfolio],
  );

  let content: ReactNode;
  if (active.items.length === 0) {
    if (active.error) content = <T212ErrorEmptyView error={active.error} onRetry={active.revalidate} />;
    else if (!active.isLoading) content = <List.EmptyView icon={view.icon} title={view.empty} />;
  } else if (view.kind === "dividends") {
    content = <DividendItems items={dividends.items} appearance={appearance} onRefresh={dividends.revalidate} />;
  } else if (view.kind === "orders") {
    content = <OrderItems orders={orders.items} currentPrices={currentPrices} onRefresh={orders.revalidate} />;
  } else {
    content = (
      <TransactionItems
        items={transactions.items}
        totalBalance={portfolio ? { value: portfolio.totalBalance, currency: portfolio.currency } : null}
        appearance={appearance}
        onRefresh={transactions.revalidate}
      />
    );
  }

  return (
    <List
      isLoading={active.isLoading}
      isShowingDetail
      searchBarPlaceholder={view.placeholder}
      searchBarAccessory={<ViewDropdown value={view.kind} onChange={setKind} />}
    >
      {content}
    </List>
  );
}
