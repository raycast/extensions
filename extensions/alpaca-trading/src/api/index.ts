import { Color, environment, getPreferenceValues, Icon, Image, showToast, Toast } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import fetch from 'node-fetch';

export namespace AlpacaApi {
  const { apiKey, apiSecret, accountType } = getPreferenceValues<Preferences>();
  const endpoint = `https://${accountType === 'paper' ? 'paper-api' : 'api'}.alpaca.markets/v2`;
  const { extensionName, commandName } = environment;
  const headers = { 'APCA-API-KEY-ID': apiKey, 'APCA-API-SECRET-KEY': apiSecret, Accept: 'application/json', 'User-Agent': `raycast/ext/${extensionName}/${commandName}` };

  export namespace Assets {
    export const ImageMap: Record<string, Image.ImageLike> = {
      us_equity: { source: Icon.Coins, tintColor: Color.Orange },
      crypto: { source: Icon.Crypto, tintColor: Color.Orange },
      us_option: { source: Icon.Bolt, tintColor: Color.Orange },
    };
  }

  export namespace Orders {
    export interface Schema {
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

    export namespace Status {
      export const ImageMap: Record<string, Image.ImageLike> = {
        partially_filled: { source: Icon.CircleProgress, tintColor: Color.Yellow },
        filled: { source: Icon.CheckCircle, tintColor: Color.Green },
        done_for_day: { source: Icon.Hourglass, tintColor: Color.Magenta },
        canceled: { source: Icon.Warning, tintColor: Color.Orange },
        expired: { source: Icon.Warning, tintColor: Color.Red },
        replaced: { source: Icon.Layers, tintColor: Color.Blue },
        pending_cancel: { source: Icon.Hourglass, tintColor: Color.Orange },
        pending_replace: { source: Icon.Hourglass, tintColor: Color.Blue },
        pending_review: { source: Icon.Hourglass, tintColor: Color.Yellow },
        accepted: { source: Icon.Circle, tintColor: Color.Blue },
        pending_new: { source: Icon.Hourglass, tintColor: Color.Purple },
        accepted_for_bidding: { source: Icon.Circle, tintColor: Color.Blue },
        stopped: { source: Icon.StopFilled, tintColor: Color.Red },
        rejected: { source: Icon.XMarkCircle, tintColor: Color.Red },
        suspended: { source: Icon.XMarkCircle, tintColor: Color.Orange },
        calculated: { source: Icon.PlusMinusDivideMultiply, tintColor: Color.Yellow },
        held: { source: Icon.StopFilled, tintColor: Color.Orange },
        new: { source: Icon.Star, tintColor: Color.Blue },
      };
    }

    export const cancelOrder = async (order: AlpacaApi.Orders.Schema) => {
      const { symbol, id } = order;
      await showToast(Toast.Style.Animated, `❌ Cancelling order for ${symbol}`, `Cancelling order: ${id}`);
      const response = await fetch(`${endpoint}/orders/${id}`, { method: 'DELETE', headers });
      if (!response.ok) {
        await showFailureToast(new Error(`HTTP error! status: ${response.status}, msg: ${response.statusText}`), { title: `Failed to cancel order order for ${symbol}` });
        return false;
      }
      await showToast(Toast.Style.Success, `✅ Cancelled order for ${symbol}`, `Successfully cancelled order: ${id}`);
      return true;
    };

    export const getDisplayPrice = (order: AlpacaApi.Orders.Schema) => {
      const priceKeyMap: { [key: string]: string | undefined } = {
        market: 'filled_avg_price',
        limit: 'limit_price',
        stop: 'stop_price',
        stop_limit: 'stop_price',
        trailing_stop: 'hwm',
      };
      return { key: priceKeyMap[order.type] ?? '', price: `${Number(order[priceKeyMap[order.type] as keyof AlpacaApi.Orders.Schema]).toFixed(2)}` ?? '' };
    };
  }

  export namespace Positions {
    export interface Schema {
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

    export const closePosition = async (position: AlpacaApi.Positions.Schema, query?: string) => {
      const { symbol, qty_available } = position;
      const msg = query ? `with ${query.split('?')[1]}` : `all ${qty_available} qty available`;
      await showToast(Toast.Style.Animated, `🛑 Closing position for ${symbol}`, msg);
      const response = await fetch(`${endpoint}/positions/${symbol}${query ?? ''}`, { method: 'DELETE', headers });
      if (!response.ok) {
        await showFailureToast(new Error(`HTTP error! status: ${response.status}, msg: ${response.statusText}`), { title: `Failed to close position for ${symbol}` });
        return false;
      }
      await showToast(Toast.Style.Success, `✅ Closed position for ${symbol}`, msg);
      return true;
    };
  }
}
