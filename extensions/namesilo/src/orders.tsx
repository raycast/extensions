import { Action, ActionPanel, Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { ArrOrObjOrNull, Order, type OrderDetails } from "./lib/types";
import { parseAsArray } from "./lib/utils/parseAsArray";

export default function Orders() {
  type OrderResponse = { order: ArrOrObjOrNull<Order> };
  const { isLoading, data } = useNameSilo<OrderResponse>("listOrders");
  const orders = parseAsArray(data?.order);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search order">
      <List.Section title={`${orders.length} orders`}>
        {orders.map((order) => (
          <List.Item
            key={order.order_number}
            icon={Icon.Document}
            title={order.order_number}
            subtitle={order.order_date}
            accessories={[{ tag: order.method }, { text: order.total }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="View Order Details"
                  target={<OrderDetails order_number={order.order_number} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function OrderDetails({ order_number }: { order_number: string }) {
  type OrderDetailsResponse = { order_details: ArrOrObjOrNull<OrderDetails> };
  const { isLoading, data } = useNameSilo<OrderDetailsResponse>("orderDetails", {
    order_number,
  });
  const orderDetails = parseAsArray(data?.order_details);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search order detail">
      <List.Section title={`Orders / ${order_number} / Details`}>
        {orderDetails.map((order, orderIndex) => (
          <List.Item
            key={orderIndex}
            icon={Icon.Dot}
            title={order.description}
            subtitle={`${order.years_qty} years`}
            accessories={[
              { text: `price: ${order.price}` },
              { text: `subtotal: ${order.subtotal}` },
              { tag: order.status },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
