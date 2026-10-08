import { listOrders, Order } from "@lemonsqueezy/lemonsqueezy.js";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { configureLemonSqueezy } from "./lemon-squeezy";

export default function SearchOrders() {
  const { isLoading, data: orders = [] } = useCachedPromise(async () => {
    configureLemonSqueezy();
    const { data } = await listOrders();
    return data?.data;
  });

  function formatDate(date: string) {
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    const formattedDate = new Date(date).toLocaleString("en-US", options).replace(",", "");
    return formattedDate;
  }

  const ORDER_STATUS_COLORS: Record<Order["data"]["attributes"]["status"], Color> = {
    pending: Color.Yellow,
    failed: Color.Orange,
    paid: Color.Green,
    refunded: Color.Red,
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search orders by number, name or email">
      {!isLoading && !orders.length ? (
        <List.EmptyView
          title="Make your first sale"
          description={`Create and share a product to start making sales.
Your orders will be displayed here.`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={getFavicon("https://app.lemonsqueezy.com/products/add")}
                title="New Product"
                url="https://app.lemonsqueezy.com/products/add"
              />
            </ActionPanel>
          }
        />
      ) : (
        orders.map((order) => (
          <List.Item
            key={order.id}
            keywords={[order.attributes.user_name, order.attributes.user_email]}
            icon={Icon.Receipt}
            title={`#${order.attributes.order_number}`}
            subtitle={formatDate(order.attributes.created_at)}
            accessories={[
              {
                icon: Icon.Check,
                tag: { value: order.attributes.status_formatted, color: ORDER_STATUS_COLORS[order.attributes.status] },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://app.lemonsqueezy.com/orders/${order.attributes.identifier}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
