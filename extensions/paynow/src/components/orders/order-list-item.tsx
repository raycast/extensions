import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";
import { Color, List } from "@raycast/api";
import { useMemo } from "react";

const OrderListItem = ({
  actions,
  detail,
  quickLook,
  order,
}: { order: ManagementSchemas["OrderDto"] } & Pick<List.Item.Props, "actions" | "detail" | "quickLook">) => {
  const keywords = useMemo<string[]>(() => {
    const kw = [
      order.id,
      order.pretty_id,
      order.customer.id,
      order.customer.profile?.id,
      order.customer.profile?.name,
      order.customer.steam?.id,
      order.customer.steam?.name,
      order.customer.minecraft?.id,
      order.customer.minecraft?.name,
      order.customer.xbox_xuid,
      order.subscription_id,
      order.type,
    ];
    return kw.filter(Boolean) as string[];
  }, [
    order.customer.id,
    order.customer.minecraft?.id,
    order.customer.minecraft?.name,
    order.customer.profile?.id,
    order.customer.profile?.name,
    order.customer.steam?.id,
    order.customer.steam?.name,
    order.customer.xbox_xuid,
    order.id,
    order.pretty_id,
    order.subscription_id,
    order.type,
  ]);

  const title = useMemo(() => {
    if (order.lines.length !== 1) {
      return `${order.lines.length} items`;
    }
    const line = order.lines[0];
    return line.product_name;
  }, [order.lines]);

  return (
    <List.Item
      id={order.id}
      key={order.id}
      title={title}
      subtitle={order.pretty_id}
      icon={order.customer.profile?.avatar_url || undefined}
      accessories={[
        {
          tag: (() => {
            if (order.status === "canceled") return { value: "Canceled", color: Color.Red };
            if (order.status === "refunded") return { value: "Refunded", color: Color.Red };
            if (order.status === "chargeback") return { value: "Chargeback", color: Color.Red };
            if (order.last_payment_error) return { value: order.last_payment_error.decline_code, color: Color.Red };
            return undefined;
          })(),
          tooltip: (() => {
            if (order.last_payment_error) return order.last_payment_error.message;
            return undefined;
          })(),
        },
        { date: order.created_at ? new Date(order.created_at) : undefined },
        {
          text: {
            value: order.total_amount_str,
            color: (() => {
              if (["canceled", "refunded", "chargeback"].includes(order.status)) return Color.Red;
              if (order.last_payment_error) return Color.Red;
              return undefined;
            })(),
          },
        },
      ]}
      keywords={keywords}
      actions={actions}
      detail={detail}
      quickLook={quickLook}
    />
  );
};

export default OrderListItem;
