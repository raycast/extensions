import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (
      (detailError &&
        !(
          detailError instanceof Error && detailError.message === "canceled"
        )) ||
      (chartError &&
        !(chartError instanceof Error && chartError.message === "canceled"))
    ) {
      const error = detailError || chartError;
      showFailureToast(error instanceof Error ? error.message : String(error), {
        title: "Error loading coin details",
        primaryAction: {
          title: "Try Again",
          onAction: () => {
            revalidateDetail();
            revalidateChart();
          },
        },
      });
    }
  }, [detailError, chartError, revalidateDetail, revalidateChart]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const refreshData = () => {
      revalidateDetail();
      revalidateChart();
    };

    const scheduleRefresh = () => {
      if (coinId && refreshInterval && refreshInterval > 0) {
        const refreshMs = refreshInterval * 60 * 1000;
        timeoutId = setTimeout(() => {
          refreshData();
          scheduleRefresh(); // Reschedule after completion
        }, refreshMs);
      }
    };

    if (refreshTimerRef.current) {
      // Clear any old timeout if it was used before
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    scheduleRefresh();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [coinId, refreshInterval, revalidateDetail, revalidateChart]);

  const isLoading = isLoadingDetail || isLoadingChart;

  // Only consider real errors, not cancelation errors
  const error =
    (detailError &&
      !(detailError instanceof Error && detailError.message === "canceled")) ||
    (chartError &&
      !(chartError instanceof Error && chartError.message === "canceled"))
      ? detailError || chartError
      : null;

  if (!coinId) {
    return (
      <Detail markdown="No coin ID provided. Please select a coin from the list." />
    );
  }

  if (isLoading) {
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

  // Assuming CoinDetailType and MarketChart are the fully expected types.
  // If not, proper type guards or validation should be implemented.
  const coinDetailData = coinDetail as CoinDetailType;
  const marketChartData = marketChart as MarketChart;

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

    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const isPositiveTrend = endPrice >= startPrice;
    const upEmoji = "🟢";
    const downEmoji = "🔴";
    const trendEmoji = isPositiveTrend ? upEmoji : downEmoji;

    const width = 30;
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

    const blocks = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
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

    // Extract market cap and other data from coinDetail
    const currencyUpper = vsCurrency.toUpperCase();
    const marketCap =
      coinDetailData.quote && coinDetailData.quote[currencyUpper]
        ? coinDetailData.quote[currencyUpper].market_cap
        : 0;
    const currentPrice =
      coinDetailData.quote && coinDetailData.quote[currencyUpper]
        ? coinDetailData.quote[currencyUpper].price
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

    // Format the coin description
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
            ((coinDetailData.description as { en: string }).en.length > 500
              ? "..."
              : "")
          : "No description available."
      : "No description available.";

    // Create modern-styled chart presentation
    let chart = "";
    // Title and basic info
    chart += `# ${coinDetailData.name} (${coinDetailData.symbol.toUpperCase()}) ${formatPercentage(priceChange24h)}\n\n`;

    // Top section - price and change
    chart += `## ${formatCurrency(currentPrice, vsCurrency)} ${trendEmoji}\n\n`;

    // Add price visualization
    chart += "### Price Chart (7 days)\n";
    chart += "```\n";
    chart += `${chartLine}\n`;
    chart += `${formatChartDate(firstDate)}${" ".repeat(Math.floor(width / 2) - 5)}${formatChartDate(midDate)}${" ".repeat(Math.floor(width / 2) - 5)}${formatChartDate(lastDate)}\n`;
    chart += "```\n\n";

    chart += `**Price Range:** ${formatCurrency(min, vsCurrency)} - ${formatCurrency(max, vsCurrency)}\n\n`;

    // Market data in table format
    chart += "### Market Data\n";
    chart += "| Metric | Value |\n";
    chart += "|--------|-------|\n";
    chart += `| Market Cap | ${formatCurrency(marketCap, vsCurrency, true)} (Rank #${coinDetailData.cmc_rank}) |\n`;
    chart += `| Trading Volume (24h) | ${formatCurrency(volume24h, vsCurrency, true)} |\n`;
    chart += `| Circulating Supply | ${formatNumber(coinDetailData.circulating_supply)} ${coinDetailData.symbol.toUpperCase()} |\n`;
    chart += `| Total Supply | ${formatNumber(coinDetailData.total_supply)} ${coinDetailData.symbol.toUpperCase()} |\n`;
    chart += `| Max Supply | ${formatNumber(coinDetailData.max_supply)} ${coinDetailData.symbol.toUpperCase()} |\n\n`;

    // Price changes table
    chart += "### Price Changes\n";
    chart += "| Timeframe | Change |\n";
    chart += "|-----------|--------|\n";
    chart += `| 24h | ${formatPercentage(priceChange24h)} |\n`;
    chart += `| 7d | ${formatPercentage(priceChange7d)} |\n`;
    chart += `| 30d | ${formatPercentage(priceChange30d)} |\n\n`;

    // Description section
    chart += `### About ${coinDetailData.name}\n`;
    chart += `${formattedDescription}\n\n`;

    // Footer
    chart += "---\n";
    chart += `*Last updated: ${dayjs(coinDetailData.last_updated).fromNow()}*\n`;
    chart += "Data provided by [CoinMarketCap](https://coinmarketcap.com/api/)";

    return chart;
  };

  return (
    <Detail
      markdown={generateSmoothColorChart()}
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
            title="View on Coinmarketcap"
            icon={{ source: Icon.Link }}
            url={`https://coinmarketcap.com/currencies/${coinDetailData.slug}`}
          />
          <Action.CopyToClipboard
            title="Copy Current Price"
            content={formatCurrency(
              coinDetailData.quote?.[vsCurrency.toUpperCase()]?.price || 0,
              vsCurrency,
            )}
          />
          <Action.OpenInBrowser
            title="Get Coinmarketcap Api Key"
            icon={{ source: Icon.Key }}
            url="https://coinmarketcap.com/api/"
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Price"
            text={formatCurrency(
              coinDetailData.quote?.[vsCurrency.toUpperCase()]?.price || 0,
              vsCurrency,
            )}
          />
          <Detail.Metadata.Label
            title="24h Change"
            text={formatPercentage(
              coinDetailData.quote?.[vsCurrency.toUpperCase()]
                ?.percent_change_24h || 0,
            )}
            icon={{
              source:
                (coinDetailData.quote?.[vsCurrency.toUpperCase()]
                  ?.percent_change_24h || 0) >= 0
                  ? Icon.ArrowUp
                  : Icon.ArrowDown,
              tintColor: getColorForValue(
                coinDetailData.quote?.[vsCurrency.toUpperCase()]
                  ?.percent_change_24h || 0,
              ),
            }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Market Cap"
            text={formatCurrency(
              coinDetailData.quote?.[vsCurrency.toUpperCase()]?.market_cap || 0,
              vsCurrency,
              true,
            )}
          />
          <Detail.Metadata.Label
            title="Rank"
            text={`#${coinDetailData.cmc_rank}`}
          />
          <Detail.Metadata.Label
            title="Volume"
            text={formatCurrency(
              coinDetailData.quote?.[vsCurrency.toUpperCase()]?.volume_24h || 0,
              vsCurrency,
              true,
            )}
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
