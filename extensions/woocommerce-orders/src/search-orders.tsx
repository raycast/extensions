import {
  Action,
  ActionPanel,
  Detail,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import {
  formatAddress,
  formatCustomerName,
  formatDate,
  formatMoney,
  formatStatus,
  getOrderDetailMarkdown,
  getStatusIcon,
} from "./format";
import { WooCommerceOrder, WooCommerceOrderStatus } from "./types";
import { fetchOrders, getOrderAdminUrl } from "./woocommerce";

export default function SearchOrders() {
  return <OrdersList />;
}

export function OrdersList({
  status,
  searchBarPlaceholder = "Search orders by customer, email, product, or order number...",
  emptyTitle = "No orders found",
  emptyDescription = "Try a different search or check the extension preferences.",
}: {
  status?: WooCommerceOrderStatus;
  searchBarPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      setError(undefined);

      fetchOrders({ searchText, status })
        .then(setOrders)
        .catch((error: Error) => {
          setOrders([]);
          setError(error.message);
          showToast({
            style: Toast.Style.Failure,
            title: "Could not load WooCommerce orders",
            message: error.message,
          });
        })
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchText, status]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={setSearchText}
      throttle
    >
      {error ? (
        <List.EmptyView title="Could not load orders" description={error} />
      ) : null}
      {!error && orders.length === 0 && !isLoading ? (
        <List.EmptyView title={emptyTitle} description={emptyDescription} />
      ) : null}
      {orders.map((order) => (
        <OrderListItem key={order.id} order={order} />
      ))}
    </List>
  );
}

function OrderListItem({ order }: { order: WooCommerceOrder }) {
  const customerName = formatCustomerName(order);
  const billingAddress = formatAddress(order.billing);
  const shippingAddress = formatAddress(order.shipping);

  return (
    <List.Item
      icon={getStatusIcon(order.status)}
      title={`#${order.number} - ${customerName}`}
      subtitle={formatStatus(order.status)}
      accessories={[
        { text: formatMoney(order) },
        {
          date: new Date(order.date_created),
          tooltip: formatDate(order.date_created),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={<OrderDetail order={order} />}
          />
          <Action
            title="Open in WooCommerce Admin"
            onAction={() => open(getOrderAdminUrl(order))}
          />
          {order.billing.email ? (
            <Action.CopyToClipboard
              title="Copy Customer Email"
              content={order.billing.email}
            />
          ) : null}
          {billingAddress ? (
            <Action.CopyToClipboard
              title="Copy Billing Address"
              content={billingAddress}
            />
          ) : null}
          {shippingAddress ? (
            <Action.CopyToClipboard
              title="Copy Shipping Address"
              content={shippingAddress}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function OrderDetail({ order }: { order: WooCommerceOrder }) {
  const billingAddress = formatAddress(order.billing);
  const shippingAddress = formatAddress(order.shipping);

  return (
    <Detail
      markdown={getOrderDetailMarkdown(order)}
      actions={
        <ActionPanel>
          <Action
            title="Open in WooCommerce Admin"
            onAction={() => open(getOrderAdminUrl(order))}
          />
          {order.billing.email ? (
            <Action.CopyToClipboard
              title="Copy Customer Email"
              content={order.billing.email}
            />
          ) : null}
          {billingAddress ? (
            <Action.CopyToClipboard
              title="Copy Billing Address"
              content={billingAddress}
            />
          ) : null}
          {shippingAddress ? (
            <Action.CopyToClipboard
              title="Copy Shipping Address"
              content={shippingAddress}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
