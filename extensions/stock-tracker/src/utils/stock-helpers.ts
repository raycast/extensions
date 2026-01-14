import { Icon, Color } from "@raycast/api";
import { StockItem, WatchlistItem, Market } from "../types";

export function extractMarketFromSymbol(symbol: string): string | null {
  const colonIndex = symbol.indexOf(":");
  if (colonIndex > 0) {
    return symbol.substring(0, colonIndex).toUpperCase();
  }
  return null;
}

export function getMarketIcon(market?: Market | string): Icon {
  const marketIcons: Partial<Record<Market, Icon>> = {
    crypto: Icon.Coin,
    forex: Icon.ArrowRight,
    commodities: Icon.Leaf,
    bonds: Icon.Document,
    etf: Icon.Layers,
    indices: Icon.BarChart,
  };

  return marketIcons[market as Market] ?? Icon.Globe;
}

export function getChangeColor(changePercent?: number): Color {
  if (changePercent === undefined) return Color.SecondaryText;
  return changePercent >= 0 ? Color.Green : Color.Red;
}

// Note: getChangeIntensityColor is identical to getChangeColor - keeping for backward compatibility
// but could be removed if not used elsewhere

export function getMarketColor(market?: Market | string): Color {
  const marketColors: Partial<Record<Market, Color>> = {
    crypto: Color.Orange,
    forex: Color.Blue,
    commodities: Color.Yellow,
    bonds: Color.Purple,
    etf: Color.Magenta,
    indices: Color.Blue,
    america: Color.Blue,
    turkey: Color.Red,
    europe: Color.Green,
    asia: Color.Orange,
    oceania: Color.Blue,
    africa: Color.Orange,
  };

  return marketColors[market as Market] ?? Color.SecondaryText;
}

export function getChangeIntensityColor(changePercent?: number): Color {
  return getChangeColor(changePercent);
}

export function getStockIcon(
  stock: StockItem | WatchlistItem,
  marketColor?: Color,
): { source: Icon; tintColor: Color } {
  const changeIcon =
    stock.changePercent !== undefined
      ? stock.changePercent >= 0
        ? Icon.ArrowUp
        : Icon.ArrowDown
      : getMarketIcon(stock.market);

  const changeIconColor =
    stock.changePercent !== undefined
      ? stock.changePercent >= 0
        ? Color.Green
        : Color.Red
      : marketColor || getMarketColor(stock.market);

  return {
    source: changeIcon,
    tintColor: changeIconColor,
  };
}

export function formatStockSubtitle(stock: StockItem, defaultExchange: string, maxLength: number = 60): string {
  // Extract exchange and symbol from symbol string (e.g., "NASDAQ:AAPL" -> "NASDAQ" and "AAPL")
  const colonIndex = stock.symbol.indexOf(":");
  const exchange =
    colonIndex > 0
      ? stock.symbol.substring(0, colonIndex).toUpperCase()
      : (stock.exchange?.toUpperCase() ?? defaultExchange);
  const symbol = colonIndex > 0 ? stock.symbol.substring(colonIndex + 1) : stock.symbol;

  // Format: "EXCHANGE:SYMBOL" (sadece exchange ve symbol)
  const subtitle = `${exchange}:${symbol}`;

  if (subtitle.length > maxLength) {
    return `${subtitle.substring(0, maxLength - 1)}…`;
  }
  return subtitle;
}
