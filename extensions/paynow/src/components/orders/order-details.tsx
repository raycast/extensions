import { Action, ActionPanel, List } from "@raycast/api";
import { withProviders } from "../../hocs/with-providers";
import { useStore } from "../../providers/store-provider/store-provider";
import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";

export interface OrderDetailsProps {
  order: ManagementSchemas["OrderDto"];
}

const Line = ({
  name,
  value,
  hidden = false,
  orderId,
}: {
  name: string;
  value: string;
  hidden?: boolean;
  orderId: string;
}) => {
  const { store } = useStore();

  if (hidden) return null;
  return (
    <List.Item
      title={name}
      accessories={[{ text: value }]}
      keywords={[value, name + value, value + name]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Value" content={value} />
          <Action.OpenInBrowser title="Open" url={`https://dashboard.paynow.gg/orders/${orderId}?s=${store?.slug}`} />
        </ActionPanel>
      }
    />
  );
};

const OrderDetails = ({ order }: OrderDetailsProps) => {
  return (
    <List navigationTitle={order.pretty_id}>
      <Line orderId={order.id} name="ID" value={order.id} />
      <Line orderId={order.id} name="Pretty ID" value={order.pretty_id} />
      <Line
        orderId={order.id}
        name="Created At"
        value={new Date(order.created_at || 0).toLocaleString()}
        hidden={!order.created_at}
      />
      <Line orderId={order.id} name="Status" value={order.status} />
    </List>
  );
};

export default withProviders(OrderDetails);
