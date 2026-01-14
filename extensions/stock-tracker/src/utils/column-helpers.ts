import { Icon, Color } from "@raycast/api";
import { StockItem, WatchlistItem, ColumnPreferences } from "../types";
import { Translations } from "../locales";
import { formatPrice, formatVolume, formatLargeNumber, formatMarket, formatFixedWidth } from "./formatting";
import { getMarketIcon, getMarketColor } from "./stock-helpers";
import { ColumnType, COLUMN_TYPES, DISPLAY_CONSTANTS } from "../constants";

export function parseColumnOrder(preferences: ColumnPreferences): ColumnType[] {
  const columns: ColumnType[] = [];

  const positions = [preferences.column1, preferences.column2, preferences.column3];

  const validColumns = new Set(COLUMN_TYPES);

  for (const column of positions) {
    if (column && column !== "none" && validColumns.has(column as ColumnType)) {
      columns.push(column as ColumnType);
    }
  }

  return columns;
}

interface Accessory {
  text: string | { value: string; color: Color };
  icon?: { source: Icon; tintColor: Color };
  tooltip?: string;
}

export function buildAccessories(
  stock: StockItem | WatchlistItem,
  columnOrder: ColumnType[],
  changeColor: Color,
  t: Translations,
): Accessory[] {
  const accessories: Accessory[] = [];
  const columnWidths = DISPLAY_CONSTANTS.COLUMN_WIDTHS;

  for (const columnType of columnOrder) {
    if (columnType === "price" && stock.price !== undefined) {
      const priceText = formatPrice(stock, undefined, t.common.na);
      accessories.push({
        text: formatFixedWidth(priceText, columnWidths.price),
        tooltip: t.searchStocks.priceTooltip(priceText),
      });
    } else if (columnType === "change" && stock.changePercent !== undefined) {
      const sign = stock.changePercent >= 0 ? "+" : "";
      const changeText = `${sign}${stock.changePercent.toFixed(2)}%`;
      accessories.push({
        text: {
          value: formatFixedWidth(changeText, columnWidths.change),
          color: changeColor,
        },
        tooltip: t.searchStocks.changeTooltip(changeText),
      });
    } else if (columnType === "changeAbs" && stock.change !== undefined) {
      const changeColorAbs = stock.change >= 0 ? Color.Green : Color.Red;
      const sign = stock.change >= 0 ? "+" : "";
      const changeAbsText = `${sign}${formatPrice(stock, Math.abs(stock.change), t.common.na)}`;
      accessories.push({
        text: {
          value: formatFixedWidth(changeAbsText, columnWidths.changeAbs),
          color: changeColorAbs,
        },
      });
    } else if (columnType === "volume" && stock.volume) {
      const volumeText = formatVolume(stock.volume);
      accessories.push({
        text: formatFixedWidth(volumeText, columnWidths.volume),
        icon: {
          source: Icon.BarChart,
          tintColor: Color.SecondaryText,
        },
        tooltip: t.searchStocks.volumeTooltip(formatLargeNumber(stock.volume)),
      });
    } else if (columnType === "exchange" && stock.exchange) {
      const exchangeText = stock.exchange.toUpperCase();
      accessories.push({
        text: formatFixedWidth(exchangeText, columnWidths.exchange),
        icon: {
          source: Icon.Building,
          tintColor: Color.SecondaryText,
        },
      });
    } else if (columnType === "market" && stock.market) {
      const marketText = formatMarket(stock.market);
      accessories.push({
        text: formatFixedWidth(marketText, columnWidths.market),
        icon: {
          source: getMarketIcon(stock.market),
          tintColor: getMarketColor(stock.market),
        },
      });
    }
  }

  return accessories;
}
