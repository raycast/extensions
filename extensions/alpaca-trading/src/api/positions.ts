import { endpoint, headers } from '@api/fetch';
import { captureException, open, Toast } from '@raycast/api';
import { getExtendedToast } from '@utils/toast';
import fetch from 'node-fetch';

export interface Position {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  asset_marginable: boolean;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
  qty_available: string;
}

export async function closePosition(position: Position, query?: string) {
  const { symbol, qty_available: qty } = position;
  const message = query ? `with ${query.split('?')[1]}` : `all ${qty} qty available`;
  const toast = await getExtendedToast({ style: Toast.Style.Animated, title: `❗Closing position for ${symbol}`, message });
  const response = await fetch(`${endpoint}/positions/${symbol}${query ?? ''}`, { method: 'DELETE', headers });
  if (!response.ok) {
    captureException(new Error(`Failed to close position for ${symbol}: ${response.status} ${response.statusText}`));
    toast.style = Toast.Style.Failure;
    toast.title = `❌ Failed to close position for ${symbol}`;
    toast.message = `HTTP error! status: ${response.status}, msg: ${response.statusText}`;
    if (response.status > 499) {
      toast.primaryAction = {
        title: 'Retry',
        shortcut: { modifiers: ['ctrl'], key: 'r' },
        onAction: async () => closePosition(position, query),
      };
    }
    return false;
  }
  toast.style = Toast.Style.Success;
  toast.title = `✅ Closed position for ${symbol}`;
  toast.message = message;
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
