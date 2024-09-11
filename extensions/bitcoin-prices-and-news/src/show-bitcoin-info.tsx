import { List, Action, ActionPanel, showToast, Toast, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

type NewsItem = {
  title: string;
  url: string;
  body: string;
  published_on: number;
  source_info: {
    name: string;
    img: string;
  };
};

type PriceData = {
  RAW: {
    BTC: {
      USD: {
        PRICE: number;
        CHANGE24HOUR: number;
        CHANGEPCT24HOUR: number;
        HIGH24HOUR: number;
        LOW24HOUR: number;
      };
    };
  };
};

type HistoricalData = {
  Data: {
    Data: Array<{
      time: number;
      high: number;
      low: number;
    }>;
  };
};

const apiBaseUrl = "https://min-api.cryptocompare.com";
const bitcoinInfoUrl = "https://www.coindesk.com/price/bitcoin";

/* news settings */
const feeds = ["coindesk", "bloomberg_crypto_", "cointelegraph", "theblock", "yahoofinance"];
const sortOrder = "popular"; // latest | popular

export default function Command() {
  const { data: priceData, isLoading: isPriceLoading } = useFetch<PriceData>(
    `${apiBaseUrl}/data/pricemultifull?fsyms=BTC&tsyms=USD`,
  );

  const { data: newsData, isLoading: isNewsLoading } = useFetch<{ Data: NewsItem[] }>(
    `${apiBaseUrl}/data/v2/news/?lang=EN&categories=BTC&sortOrder=${sortOrder}&feeds=${feeds.join(",")}`,
  );

  const { data: historicalData, isLoading: isHistoricalLoading } = useFetch<HistoricalData>(
    `${apiBaseUrl}/data/v2/histoday?fsym=BTC&tsym=USD&limit=30`,
  );

  const isLoading = isPriceLoading || isNewsLoading || isHistoricalLoading;

  if (newsData && !newsData.Data) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch news",
      message: "Please try again later",
    });
  }

  const btcData = priceData?.RAW?.BTC?.USD;
  const historicalPrices = historicalData?.Data?.Data ?? [];

  const getHighLow = (days: number) => {
    const relevantData = historicalPrices.slice(-days);
    const high = Math.max(...relevantData.map((d) => d.high));
    const low = Math.min(...relevantData.map((d) => d.low));
    return { high, low };
  };

  const weekData = getHighLow(7);
  const twoWeekData = getHighLow(14);
  const monthData = getHighLow(30);

  const chartUrl = useMemo(() => {
    if (!historicalData?.Data?.Data) return "";

    const prices = historicalData.Data.Data.map((d) => d.high);
    const labels = historicalData.Data.Data.map((d) => {
      const date = new Date(d.time * 1000);
      return date.toLocaleString("en-US", { day: "numeric", month: "short" });
    });

    const config = {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            data: prices,
            fill: false,
            borderColor: "#F7931A", // Bitcoin orange
            tension: 0.1,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,

        legend: {
          display: false, // Remove legend
        },

        scales: {
          x: {
            grid: {
              display: false, // Remove x-axis grid
            },
          },
          y: {
            grid: {
              display: false, // Remove y-axis grid
            },
            display: false, // Hide y-axis completely
          },
        },
      },
    };

    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&backgroundColor=transparent`;
  }, [historicalData]);

  return (
    <List isLoading={isLoading} isShowingDetail>
      {btcData && (
        <>
          <List.Section title="Bitcoin price">
            {/* Bitcoin price info */}
            <List.Item
              icon={{
                source: btcData.CHANGE24HOUR >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                tintColor: btcData.CHANGE24HOUR >= 0 ? Color.Green : Color.Red,
              }}
              title={`${formatCurrency("USD", btcData.PRICE)}`}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={bitcoinInfoUrl} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="24h Change"
                        text={`${formatCurrency("USD", btcData.CHANGE24HOUR)} (${btcData.CHANGEPCT24HOUR.toFixed(2)}%)`}
                        icon={{
                          source: btcData.CHANGE24HOUR >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                          tintColor: btcData.CHANGE24HOUR >= 0 ? Color.Green : Color.Red,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="24h High"
                        text={formatCurrency("USD", btcData.HIGH24HOUR)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="24h Low"
                        text={formatCurrency("USD", btcData.LOW24HOUR)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="7 Day High" text={formatCurrency("USD", weekData.high)} />
                      <List.Item.Detail.Metadata.Label title="7 Day Low" text={formatCurrency("USD", weekData.low)} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="14 Day High"
                        text={formatCurrency("USD", twoWeekData.high)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="14 Day Low"
                        text={formatCurrency("USD", twoWeekData.low)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="30 Day High"
                        text={formatCurrency("USD", monthData.high)}
                      />
                      <List.Item.Detail.Metadata.Label title="30 Day Low" text={formatCurrency("USD", monthData.low)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />

            {/* Bitcoin price chart for the last 30 days */}
            <List.Item
              icon={Icon.LineChart}
              title={`30 days`}
              detail={<List.Item.Detail markdown={`![Bitcoin Price Chart](${chartUrl})`} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={bitcoinInfoUrl} />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
      <List.Section title="Bitcoin news">
        {(newsData?.Data ?? [])
          .sort((a, b) => b.published_on - a.published_on)
          .slice(0, 100)
          .map((item, index) => (
            <List.Item
              key={index}
              title={item.title}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={`### ${item.title} \n ${item.body}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Published"
                        text={formatDistanceToNow(new Date(item.published_on * 1000), { addSuffix: true }).replace(
                          "about ",
                          "",
                        )}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Source"
                        icon={item.source_info.img}
                        text={item.source_info.name}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

const formatCurrency = (currency: string, value: number) => {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
