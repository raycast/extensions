import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { hasSchwabCredentials, schwabOAuth } from "../lib/oauth";
import { useOrders } from "../hooks/useOrders";
import { formatCurrency, formatNumber, formatDateTime } from "../lib/formatters";
import { getOrderGroup, type Order, type OrderGroup } from "../types/orders";
import { Onboarding } from "../components/Onboarding";
import { SymbolDetail } from "../components/SymbolDetail";

const GROUP_TITLES: Record<OrderGroup, string> = {
  open: "Open",
  filled: "Filled",
  other: "Canceled & Other",
};

function statusColor(group: OrderGroup, status: string): Color {
  if (group === "open") return Color.Blue;
  if (group === "filled") return Color.Green;
  return status === "REJECTED" ? Color.Red : Color.SecondaryText;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function averageFillPrice(order: Order): number | undefined {
  const legs = (order.orderActivityCollection ?? []).flatMap((activity) => activity.executionLegs ?? []);
  const totalQuantity = legs.reduce((sum, leg) => sum + (leg.quantity ?? 0), 0);
  if (totalQuantity === 0) return undefined;
  const totalCost = legs.reduce((sum, leg) => sum + (leg.price ?? 0) * (leg.quantity ?? 0), 0);
  return totalCost / totalQuantity;
}

function OrderListItem({ order }: { order: Order }) {
  const leg = order.orderLegCollection?.[0];
  const symbol = leg?.instrument?.symbol ?? "—";
  const instruction = titleCase(leg?.instruction ?? "");
  const quantity = order.quantity ?? leg?.quantity ?? 0;
  const group = getOrderGroup(order);
  const status = order.status ?? "UNKNOWN";

  const orderKind = titleCase(order.orderType ?? "");
  const fillPrice = averageFillPrice(order);
  const priceText =
    group === "filled" && fillPrice != null
      ? `@ ${formatCurrency(fillPrice)}`
      : order.price != null
        ? `limit ${formatCurrency(order.price)}`
        : order.stopPrice != null
          ? `stop ${formatCurrency(order.stopPrice)}`
          : "";

  const accessories: List.Item.Accessory[] = [
    { tag: { value: titleCase(status), color: statusColor(group, status) }, tooltip: "Status" },
  ];
  if (order.enteredTime) {
    accessories.push({ text: formatDateTime(Date.parse(order.enteredTime)), tooltip: "Entered" });
  }

  return (
    <List.Item
      key={order.orderId}
      title={`${instruction} ${formatNumber(quantity)} ${symbol}`}
      subtitle={[orderKind, priceText].filter(Boolean).join(" ")}
      icon={{
        source: instruction.startsWith("Buy") ? Icon.Plus : Icon.Minus,
        tintColor: instruction.startsWith("Buy") ? Color.Green : Color.Red,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          {leg?.instrument?.symbol && (
            <Action.Push title="View Symbol" icon={Icon.Eye} target={<SymbolDetail symbol={leg.instrument.symbol} />} />
          )}
          {leg?.instrument?.symbol && <Action.CopyToClipboard title="Copy Ticker" content={leg.instrument.symbol} />}
        </ActionPanel>
      }
    />
  );
}

function RecentOrders() {
  const { data: orders, isLoading } = useOrders(30);

  const groups: Record<OrderGroup, Order[]> = { open: [], filled: [], other: [] };
  for (const order of orders ?? []) {
    groups[getOrderGroup(order)].push(order);
  }
  const byNewest = (a: Order, b: Order) => Date.parse(b.enteredTime ?? "") - Date.parse(a.enteredTime ?? "");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search orders...">
      {(Object.keys(GROUP_TITLES) as OrderGroup[]).map((group) =>
        groups[group].length > 0 ? (
          <List.Section key={group} title={GROUP_TITLES[group]} subtitle={`${groups[group].length}`}>
            {groups[group].sort(byNewest).map((order, index) => (
              <OrderListItem key={order.orderId ?? index} order={order} />
            ))}
          </List.Section>
        ) : null,
      )}
      {!isLoading && (orders ?? []).length === 0 && (
        <List.EmptyView
          title="No Recent Orders"
          description="No orders were placed in the last 30 days."
          icon={Icon.Receipt}
        />
      )}
    </List>
  );
}

const Authed = withAccessToken(schwabOAuth)(RecentOrders);

export default function Command() {
  return hasSchwabCredentials() ? <Authed /> : <Onboarding />;
}
