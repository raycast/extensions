import { cancelOrder } from '@api/orders';
import { useOrders } from '@hooks/useOrders';
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Image, List } from '@raycast/api';
import { useCachedState } from '@raycast/utils';
import { asDollarAmt, getAssetImage, getOrderDisplayPrice, getOrderStatusImage } from '@utils/display';
import { useState } from 'react';

export default function ManageOrders() {
  const [showingDetails, setShowDetails] = useCachedState('list-orders-show-details', false);
  const [orderStatus, setOrderStatus] = useState('open');
  const { isLoading, orders, revalidate, error } = useOrders(orderStatus);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && orders.length !== 0 && showingDetails}
      searchBarPlaceholder="Search by symbol, side, status, type, id..."
      filtering
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Order Status"
          storeValue
          onChange={(value: string) => {
            setOrderStatus(value);
            revalidate();
          }}
        >
          <List.Dropdown.Item title="Open Orders" value="open" />
          <List.Dropdown.Item title="Closed Orders" value="closed" />
          <List.Dropdown.Item title="All Orders" value="all" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title={showingDetails ? 'Hide Details' : 'Show Details'} icon={showingDetails ? Icon.EyeDisabled : Icon.Eye} onAction={() => setShowDetails(x => !x)} />
        </ActionPanel>
      }
    >
      {!isLoading && error && (
        <List.EmptyView title="Error while looking up orders" icon={{ source: 'list-icon.png', mask: Image.Mask.RoundedRectangle }} description={error.message} />
      )}
      {!isLoading && !error && orders.length === 0 && (
        <List.EmptyView
          title="No orders found"
          icon={{ source: 'list-icon.png', mask: Image.Mask.RoundedRectangle }}
          description={`Looked up ${orderStatus.toUpperCase()} orders`}
        />
      )}
      {orders.map(order => (
        <List.Item
          icon={{ source: 'list-icon.png', mask: Image.Mask.RoundedRectangle }}
          key={order.client_order_id}
          title={order.symbol}
          keywords={[order.symbol, order.client_order_id, order.id, order.side, order.order_type, order.time_in_force, order.status]}
          subtitle={showingDetails ? '' : `${order.order_type.replaceAll('_', ' ')} ${order.side} ${Number(order.qty).toFixed(1)} share`}
          accessories={
            showingDetails
              ? [
                  { date: new Date(order.updated_at), tooltip: order.updated_at, icon: Icon.Calendar },
                  { icon: { source: Icon.CircleFilled, tintColor: order.side === 'buy' ? Color.Green : Color.Red }, tooltip: order.side },
                ]
              : [
                  { date: new Date(order.updated_at), tooltip: order.updated_at, icon: Icon.Calendar },
                  {
                    text: `${Number(order.filled_qty).toFixed(1)}/${Number(order.qty).toFixed(1)}`,
                    icon: getOrderStatusImage(order.status),
                    tooltip: order.status.replaceAll('_', ' '),
                  },
                  {
                    tag: getOrderDisplayPrice(order).price,
                    icon: Icon.AtSymbol,
                    tooltip: getOrderDisplayPrice(order).key.replaceAll('_', ' '),
                  },
                  { tag: order.time_in_force.toUpperCase() },
                  { icon: { source: Icon.CircleFilled, tintColor: order.side === 'buy' ? Color.Green : Color.Red }, tooltip: order.side },
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link title="Order ID" text={order.id} target={`https://app.alpaca.markets/paper/dashboard/order/${order.id}`} />
                  <List.Item.Detail.Metadata.Label title="Client Order ID" text={order.client_order_id} />
                  <List.Item.Detail.Metadata.TagList title="Side">
                    <List.Item.Detail.Metadata.TagList.Item text={order.side.toUpperCase()} color={order.side === 'buy' ? Color.Green : Color.Red} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={order.order_type.replaceAll('_', ' ').toUpperCase()} />
                    <List.Item.Detail.Metadata.TagList.Item text={order.time_in_force.replaceAll('_', ' ').toUpperCase()} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title={`${Number(order.qty).toFixed(1)} qty @`}>
                    {order.filled_avg_price && <List.Item.Detail.Metadata.TagList.Item text={`Avg: ${asDollarAmt(order.filled_avg_price, 2)}`} color={Color.Yellow} />}
                    {order.limit_price && <List.Item.Detail.Metadata.TagList.Item text={`Limit: ${asDollarAmt(order.limit_price, 2)}`} color={Color.Yellow} />}
                    {order.stop_price && <List.Item.Detail.Metadata.TagList.Item text={`Stop: ${asDollarAmt(order.stop_price, 2)}`} color={Color.Yellow} />}
                    {order.trail_price && <List.Item.Detail.Metadata.TagList.Item text={`Trail: ${asDollarAmt(order.trail_price, 2)}`} color={Color.Yellow} />}
                    {order.trail_percent && <List.Item.Detail.Metadata.TagList.Item text={`Trail: ${Number(order.trail_percent).toFixed(2)} %`} color={Color.Yellow} />}
                    {order.hwm && <List.Item.Detail.Metadata.TagList.Item text={`HWM: ${asDollarAmt(order.hwm, 2)}`} color={Color.Yellow} />}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={`${Number(order.filled_qty).toFixed(1)} / ${Number(order.qty).toFixed(1)} ${order.status.replaceAll('_', ' ').toUpperCase()}`}
                    icon={getOrderStatusImage(order.status)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link title="Symbol" text={order.symbol} target={`https://app.alpaca.markets/trade/${order.symbol}`} />
                  <List.Item.Detail.Metadata.TagList title="Asset Class">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={order.asset_class.replaceAll('_', ' ')}
                      icon={getAssetImage(order.asset_class) ?? getAssetImage('us_equity')}
                      color={Color.Orange}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Created @" text={order.created_at} />
                  <List.Item.Detail.Metadata.Label title="Submitted @" text={order.submitted_at} />
                  {order.updated_at && <List.Item.Detail.Metadata.Label title="Updated @" text={order.updated_at} />}
                  {order.filled_at && <List.Item.Detail.Metadata.Label title="Filled @" text={order.filled_at} />}
                  {order.canceled_at && <List.Item.Detail.Metadata.Label title="Canceled @" text={order.canceled_at} />}
                  {order.failed_at && <List.Item.Detail.Metadata.Label title="Failed @" text={order.failed_at} />}
                  {order.expired_at && <List.Item.Detail.Metadata.Label title="Expired @" text={order.expired_at} />}
                  {order.replaced_at && <List.Item.Detail.Metadata.Label title="Replaced @" text={order.replaced_at} />}
                  {order.replaced_by && (
                    <List.Item.Detail.Metadata.Link title="Replaced By" text={order.replaced_by} target={`https://app.alpaca.markets/paper/dashboard/order/${order.replaced_by}`} />
                  )}
                  {order.replaces && (
                    <List.Item.Detail.Metadata.Link title="Replaces" text={order.replaces} target={`https://app.alpaca.markets/paper/dashboard/order/${order.replaces}`} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Alpaca" url={`https://app.alpaca.markets/paper/dashboard/order/${order.id}`} icon={Icon.Link} />
              <Action title={showingDetails ? 'Hide Details' : 'Show Details'} icon={showingDetails ? Icon.EyeDisabled : Icon.Eye} onAction={() => setShowDetails(x => !x)} />
              <Action.CopyToClipboard title="Copy Details JSON" content={JSON.stringify(order, null, 2)} shortcut={{ modifiers: ['cmd', 'shift'], key: '.' }} />
              <ActionPanel.Section title="Management">
                <Action
                  title="Cancel Order"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ['ctrl'], key: 'x' }}
                  onAction={async () =>
                    confirmAlert({
                      title: `Cancel the order for ${order.symbol}?`,
                      message: `Are you sure you want to cancel the ${order.order_type.replaceAll('_', ' ')} order ${order.client_order_id}?`,
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      primaryAction: {
                        title: 'Yes',
                        style: Alert.ActionStyle.Destructive,
                        onAction: () => cancelOrder(order).finally(() => setTimeout(revalidate, 1000)),
                      },
                      dismissAction: { title: 'No', style: Alert.ActionStyle.Cancel },
                    })
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
