import { endpoint, headers } from '@api/fetch';
import { captureException, open, Toast } from '@raycast/api';
import { getExtendedToast } from '@utils/toast';
import fetch from 'node-fetch';

export interface Order {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at?: string;
  expired_at?: string;
  canceled_at?: string;
  failed_at?: string;
  replaced_at?: string;
  replaced_by?: string;
  replaces?: string;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional?: number;
  qty: string;
  filled_qty: string;
  filled_avg_price: string;
  order_class: string;
  order_type: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price?: number;
  stop_price?: number;
  status: string;
  extended_hours: boolean;
  trail_percent?: number;
  trail_price?: number;
  hwm?: number;
  subtag?: string;
  source: string;
}

export async function cancelOrder(order: Order) {
  const { symbol, id } = order;
  const toast = await getExtendedToast({ style: Toast.Style.Animated, title: `❗Cancelling order for ${symbol}`, message: `Cancelling order: ${id}` });
  const response = await fetch(`${endpoint}/orders/${id}`, { method: 'DELETE', headers });
  if (!response.ok) {
    captureException(new Error(`Failed to cancel order for ${symbol}: ${response.status} ${response.statusText}`));
    toast.style = Toast.Style.Failure;
    toast.title = `❌ Failed to cancel order for ${symbol}`;
    toast.message = `HTTP error! status: ${response.status}, msg: ${response.statusText}`;
    if (response.status > 499) {
      toast.primaryAction = {
        title: 'Retry',
        shortcut: { modifiers: ['ctrl'], key: 'r' },
        onAction: async () => cancelOrder(order),
      };
    }
    return false;
  }
  toast.style = Toast.Style.Success;
  toast.title = `✅ Cancelled order for ${symbol}`;
  toast.message = `Successfully cancelled order: ${id}`;
  toast.primaryAction = {
    title: 'Open Orders',
    shortcut: { modifiers: ['ctrl'], key: 'o' },
    onAction: async () => {
      await open('raycast://extensions/stelo/alpaca-trading/manage-orders');
      return true;
    },
  };
  return true;
}
