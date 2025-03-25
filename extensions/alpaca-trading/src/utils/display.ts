import { Order } from '@api/orders';
import { Color, Icon, Image } from '@raycast/api';

export function asDollarAmt(value: string | number, precision: number) {
  return `${Number(value).toFixed(precision)}`;
}

export function asPercentage(value: string | number, precision: number) {
  return `${(Number(value) * 100).toFixed(precision)} %`;
}

export function getOrderDisplayPrice(order: Order) {
  const priceKeyMap: { [key: string]: string | undefined } = {
    market: 'filled_avg_price',
    limit: 'limit_price',
    stop: 'stop_price',
    stop_limit: 'stop_price',
    trailing_stop: 'hwm',
  };
  return { key: priceKeyMap[order.type] ?? '', price: `${Number(order[priceKeyMap[order.type] as keyof Order]).toFixed(2)}` ?? '' };
}

export function getAssetImage(symbol: string) {
  const mapping: Record<string, Image> = {
    us_equity: { source: Icon.Coins, tintColor: Color.Orange },
    crypto: { source: Icon.Crypto, tintColor: Color.Orange },
    us_option: { source: Icon.Bolt, tintColor: Color.Orange },
  };
  return mapping[symbol];
}

export function getOrderStatusImage(status: string) {
  const map: Record<string, Image> = {
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
  return map[status];
}
