import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import {
  useCoinDetails,
  useMarketChart,
  CoinDetail as CoinDetailType,
  MarketChart,
} from "./coinmarketcap";
import {
  getPreferences,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getColorForValue,
} from "./utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useRef } from "react";
dayjs.extend(relativeTime);

// Define the interface to match Raycast's expected type
interface CoinDetailLaunchArguments {
  arguments: {
    coinId: string;
  };
}

export default function CoinDetail(
  props: LaunchProps<{ arguments: { coinId: string } }>,
) {
  const coinId = props.arguments.coinId || "";
  const { vsCurrency, refreshInterval } = getPreferences();
  const {
    data: coinDetail,
    isLoading: isLoadingDetail,
    error: detailError,
    revalidate: revalidateDetail,
  } = useCoinDetails(coinId);
  const {
    data: marketChart,
    isLoading: isLoadingChart,
    error: chartError,
    revalidate: revalidateChart,
  } = useMarketChart(coinId, 7);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (detailError || chartError) {
      const error = detailError || chartError;
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading coin details",
        message: error instanceof Error ? error.message : String(error),
        primaryAction: {
          title: "Try Again",
          onAction: () => {
            revalidateDetail();
            revalidateChart();
          },
        },
      });
    }
  }, [detailError, chartError]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (coinId && refreshInterval && refreshInterval > 0) {
      const refreshMs = refreshInterval * 60 * 1000;
      refreshTimerRef.current = setInterval(() => {
        revalidateDetail();
        revalidateChart();
      }, refreshMs);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [coinId, refreshInterval, revalidateDetail, revalidateChart]);

  const isLoading = isLoadingDetail || isLoadingChart;
  const error = detailError || chartError;

  if (!coinId) {
    return (
      <Detail markdown="No coin ID provided. Please select a coin from the list." />
    );
  }

  if (isLoading && !coinDetail) {
    return <Detail isLoading={true} markdown="Loading coin details..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Coin Details\n\n${error instanceof Error ? error.message : String(error)}`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                revalidateDetail();
                revalidateChart();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!coinDetail) {
    return <Detail markdown="No coin data available." />;
  }

  const coinDetailData = coinDetail as unknown as CoinDetailType;
  const marketChartData = marketChart as unknown as MarketChart;

  const generateSmoothColorChart = () => {
    if (
      !marketChartData ||
      !marketChartData.prices ||
      marketChartData.prices.length < 2
    ) {
      return "No chart data available.";
    }

    const prices = marketChartData.prices.map((p: [number, number]) => p[1]);
    const timestamps = marketChartData.prices.map(
      (p: [number, number]) => p[0],
    );
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min;

    // Determine overall trend
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const isPositiveTrend = endPrice >= startPrice;

    // Use emojis for indicators that display in color
    const upEmoji = "🟢"; // Green circle
    const downEmoji = "🔴"; // Red circle
    const trendEmoji = isPositiveTrend ? upEmoji : downEmoji;

    // Create price visualization
    const width = 30;

    // Sample the data to fit our width
    const sampledPrices = [];
    const sampledDates = [];
    const step = prices.length / width;

    for (let i = 0; i < width; i++) {
      const index = Math.floor(i * step);
      if (index < prices.length) {
        sampledPrices.push(prices[index]);
        sampledDates.push(new Date(timestamps[index]));
      }
    }

    // Create the chart with block characters (more compatible with Raycast)
    const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

    // Add the chart line (simplified for better compatibility)
    let chartLine = "";
    for (const price of sampledPrices) {
      const normalizedPrice = (price - min) / range;
      const blockIndex = Math.min(
        Math.floor(normalizedPrice * blocks.length),
        blocks.length - 1,
      );
      chartLine += blocks[blockIndex];
    }

    // Format dates
    const firstDate = sampledDates[0];
    const midDate = sampledDates[Math.floor(sampledDates.length / 2)];
    const lastDate = sampledDates[sampledDates.length - 1];

    const formatChartDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // Calculate percentage change
    const percentChange = ((endPrice - startPrice) / startPrice) * 100;
    const changeFormatted = formatPercentage(percentChange);

    // Create modern-styled chart presentation
    let chart = "";

    // Top section - price and change
    chart += `### ${formatCurrency(endPrice, vsCurrency)} ${trendEmoji}\n`;
    chart += `##### Change (7d): ${changeFormatted}\n\n`;

    // Add price visualization
    chart += "```\n";
    chart += `${chartLine}\n`;
    chart += `${formatChartDate(firstDate)}${" ".repeat(Math.floor(width / 2) - 5)}${formatChartDate(midDate)}${" ".repeat(Math.floor(width / 2) - 5)}${formatChartDate(lastDate)}\n`;
    chart += "```\n\n";

    // Add price range right after the chart
    chart += `**Price Range:** ${formatCurrency(min, vsCurrency)} - ${formatCurrency(max, vsCurrency)}\n\n\n\n`;

    // Key stats in a table format for better readability
    chart += "| Metric | Value |\n";
    chart += "|--------|-------|\n";
    chart += `| Market Cap | ${formatCurrency(marketCap, vsCurrency, true)} |\n`;

    // Add volume information
    const totalVolume = marketChartData.total_volumes.reduce(
      (sum, v) => sum + v[1],
      0,
    );
    const avgDailyVolume = totalVolume / 7;
    chart += `| 24h Volume | ${formatCurrency(avgDailyVolume, vsCurrency, true)} |\n`;
    chart += `| Highest (7d) | ${formatCurrency(max, vsCurrency)} |\n`;
    chart += `| Lowest (7d) | ${formatCurrency(min, vsCurrency)} |\n`;

    return chart;
  };

  // Format the description to handle potential missing content
  const formattedDescription = coinDetailData.description
    ? typeof coinDetailData.description === "string"
      ? coinDetailData.description
          .replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, "[$2]($1)")
          .replace(/<\/?\w+>/g, "")
          .substring(0, 500) +
        (coinDetailData.description.length > 500 ? "..." : "")
      : typeof coinDetailData.description === "object" &&
        coinDetailData.description &&
        "en" in (coinDetailData.description as { en: string })
        ? (coinDetailData.description as { en: string }).en
            .replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, "[$2]($1)")
            .replace(/<\/?\w+>/g, "")
            .substring(0, 500) +
          ((coinDetailData.description as { en: string }).en.length > 500 ? "..." : "")
        : "No description available."
    : "No description available.";

  // Extract and format price and market data
  const currencyUpper = vsCurrency.toUpperCase();
  const price =
    coinDetailData.quote && coinDetailData.quote[currencyUpper]
      ? coinDetailData.quote[currencyUpper].price
      : 0;
  const marketCap =
    coinDetailData.quote && coinDetailData.quote[currencyUpper]
      ? coinDetailData.quote[currencyUpper].market_cap
      : 0;
  const volume24h =
    coinDetailData.quote && coinDetailData.quote[currencyUpper]
      ? coinDetailData.quote[currencyUpper].volume_24h
      : 0;
  const priceChange24h =
    coinDetailData.quote && coinDetailData.quote[currencyUpper]
      ? coinDetailData.quote[currencyUpper].percent_change_24h
      : 0;
  const priceChange7d =
    coinDetailData.quote && coinDetailData.quote[currencyUpper]
      ? coinDetailData.quote[currencyUpper].percent_change_7d
      : 0;
  const priceChange30d =
    coinDetailData.quote && coinDetailData.quote[currencyUpper]
      ? coinDetailData.quote[currencyUpper].percent_change_30d
      : 0;

  // Get high and low values
  // Since CoinMarketCap doesn't provide 24h high/low directly, we'll estimate it based on current price and 24h change
  const high24h = price * (1 + Math.max(0, priceChange24h / 100));
  const low24h = price * (1 + Math.min(0, priceChange24h / 100));

  const markdown = `
# ${coinDetailData.name} (${coinDetailData.symbol.toUpperCase()}) ${formatPercentage(priceChange24h)}

![Coin Logo](${coinDetailData.logo || ""})

## ${formatCurrency(price, vsCurrency)}

### Price Chart (7 days)
${generateSmoothColorChart()}

### Market Data
| Metric | Value |
|--------|-------|
| Market Cap | ${formatCurrency(marketCap, vsCurrency, true)} (Rank #${coinDetailData.cmc_rank}) |
| Trading Volume (24h) | ${formatCurrency(volume24h, vsCurrency, true)} |
| Circulating Supply | ${formatNumber(coinDetailData.circulating_supply)} ${coinDetailData.symbol.toUpperCase()} |
| Total Supply | ${formatNumber(coinDetailData.total_supply)} ${coinDetailData.symbol.toUpperCase()} |
| Max Supply | ${formatNumber(coinDetailData.max_supply)} ${coinDetailData.symbol.toUpperCase()} |

### Price Changes
| Timeframe | Change |
|-----------|--------|
| 24h | ${formatPercentage(priceChange24h)} |
| 7d | ${formatPercentage(priceChange7d)} |
| 30d | ${formatPercentage(priceChange30d)} |

### 24h Price Range
| High | Low |
|------|-----|
| ${formatCurrency(high24h, vsCurrency)} | ${formatCurrency(low24h, vsCurrency)} |

### About ${coinDetailData.name}
${formattedDescription}

---
*Last updated: ${dayjs(coinDetailData.last_updated).fromNow()}*  
Data provided by [CoinMarketCap](https://coinmarketcap.com/api/)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${coinDetailData.name} Details`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              revalidateDetail();
              revalidateChart();
            }}
          />
          <Action.OpenInBrowser
            title="View on CoinMarketCap"
            icon={{ source: Icon.Link }}
            url={`https://coinmarketcap.com/currencies/${coinDetailData.slug}`}
          />
          <Action.CopyToClipboard
            title="Copy Current Price"
            content={formatCurrency(price, vsCurrency)}
          />
          <Action.OpenInBrowser
            title="Get CoinMarketCap API Key"
            icon={{ source: Icon.Key }}
            url="https://coinmarketcap.com/api/"
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Price"
            text={formatCurrency(price, vsCurrency)}
          />
          <Detail.Metadata.Label
            title="24h Change"
            text={formatPercentage(priceChange24h)}
            icon={{
              source: priceChange24h >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
              tintColor: getColorForValue(priceChange24h),
            }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Market Cap"
            text={formatCurrency(marketCap, vsCurrency, true)}
          />
          <Detail.Metadata.Label
            title="Rank"
            text={`#${coinDetailData.cmc_rank}`}
          />
          <Detail.Metadata.Label
            title="Volume"
            text={formatCurrency(volume24h, vsCurrency, true)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Circulating Supply"
            text={formatNumber(coinDetailData.circulating_supply)}
          />
          <Detail.Metadata.Label
            title="Last Updated"
            text={dayjs(coinDetailData.last_updated).fromNow()}
          />
        </Detail.Metadata>
      }
    />
  );
}
