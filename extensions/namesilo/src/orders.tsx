import { Action, ActionPanel, Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { Order, type OrderDetails } from "./lib/types";

export default function Orders() {
    type OrderResponse = {order: Order[] | Order | null};
    const { isLoading, data } = useNameSilo<OrderResponse>("listOrders");
    const orders = !data?.order ? [] : (data.order instanceof Array ? data.order : [data.order]);
    
    return <List isLoading={isLoading}>
        {orders.map(order => <List.Item key={order.order_number} icon={Icon.Document} title={order.order_number} subtitle={order.order_date} accessories={[
            { tag: order.method },
            {text: order.total }
        ]} actions={<ActionPanel>
            <Action.Push title="View Order Details" target={<OrderDetails order_number={order.order_number} />} />
        </ActionPanel>} />)}
    </List>
}

function OrderDetails({ order_number }: { order_number: string }) {
    type OrderDetailsResponse = {order_details: OrderDetails[] | OrderDetails | null};
    const { isLoading, data } = useNameSilo<OrderDetailsResponse>("orderDetails", new URLSearchParams({
        order_number
    }));
    const orderDetails = !data?.order_details ? [] : (data.order_details instanceof Array ? data.order_details : [data.order_details]);

    return <List isLoading={isLoading} navigationTitle={`Orders / ${order_number} / Details`}>
        {orderDetails.map((order, orderIndex) => <List.Item key={orderIndex} title={order.description} subtitle={`${order.years_qty} years`} accessories={[
            { text: `price: ${order.price}` },
            { text: `subtotal: ${order.subtotal}` },
            { tag: order.status }
        ]} />)}
    </List>
}