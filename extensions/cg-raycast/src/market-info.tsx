import { Action, ActionPanel, Detail, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchCoinTickets, fetchPriceChange } from "./utils/cg-api";
import { IPriceChange } from "./types/cg/priceChange";

type SortOrder = "asc" | "desc";
type TimeFrame = "5m" | "15m" | "30m" | "1h" | "4h" | "12h" | "24h";

interface PriceChangeDropdownProps {
  onSelectionChange: (timeFrame: TimeFrame | null, order: SortOrder | null) => void;
}

function PriceChangeDropdown({ onSelectionChange }: PriceChangeDropdownProps) {
  const timeFrames: TimeFrame[] = ["5m", "15m", "30m", "1h", "4h", "12h", "24h"];

  const handleSelection = (value: string) => {
    if (value === "default") {
      onSelectionChange(null, null);
      return;
    }

    const [timeFrame, order] = value.split("-") as [TimeFrame, SortOrder];
    onSelectionChange(timeFrame, order);
  };

  return (
    <List.Dropdown tooltip="选择价格变化时间段" storeValue={true} placeholder="选择时间段" onChange={handleSelection}>
      <List.Dropdown.Section title="排序选项">
        <List.Dropdown.Item key="default" title="Default" value="default" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="涨幅榜">
        {timeFrames.map((timeFrame) => (
          <List.Dropdown.Item key={`${timeFrame}-desc`} title={timeFrame} value={`${timeFrame}-desc`} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="跌幅榜">
        {timeFrames.map((timeFrame) => (
          <List.Dropdown.Item key={`${timeFrame}-asc`} title={timeFrame} value={`${timeFrame}-asc`} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function CoinDetail({ symbol }: { symbol: string }) {
  const { data, isLoading } = useCachedPromise(
    async (symbol: string) => {
      return await fetchCoinTickets(symbol);
    },
    [symbol],
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const generateMarkdown = () => {
    if (isLoading) {
      return "Loading coin details...";
    }
    if (!data?.data || data.data.length === 0) {
      return `# No data found for ${symbol}`;
    }

    let markdown = `\n`;
    markdown += `| Exchange | Symbol | Price | Funding Rate |\n`;
    markdown += `|---|---|---|---|\n`;
    for (const ticket of data.data) {
      const changeIcon = ticket.h24PriceChangePercent > 0 ? "📈" : "📉";
      markdown += `| ${ticket.exName} | ${ticket.symbol} | ${changeIcon} $${formatCurrency(ticket.price)} | ${
        ticket.fundingRate ? `${ticket.fundingRate.toFixed(4)} %` : "-"
      } |\n`;
    }
    markdown += `|---|---|---|---|\n`;

    return markdown;
  };

  return (
    <Detail
      markdown={generateMarkdown()}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Coinglass"
            url={`https://www.coinglass.com/currencies/${symbol}`}
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}

const getPercentForTimeFrame = (item: IPriceChange, timeFrame: TimeFrame): number => {
  const mapping: Record<TimeFrame, keyof IPriceChange> = {
    "5m": "m5PriceChangePercent",
    "15m": "m15PriceChangePercent",
    "30m": "m30PriceChangePercent",
    "1h": "h1PriceChangePercent",
    "4h": "h4PriceChangePercent",
    "12h": "h12PriceChangePercent",
    "24h": "h24PriceChangePercent",
  };
  return item[mapping[timeFrame]] as number;
};

export default function Command(props: { arguments: { symbol: string } }) {
  const { symbol } = props.arguments;
  console.log(`symbol: ${symbol}`);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder | null>(null);
  const { data, isLoading } = useCachedPromise(fetchPriceChange);

  const displayData = useMemo(() => {
    if (!data?.data) return [];

    // 如果没有选择排序，返回原始数据
    if (!selectedTimeFrame || !sortOrder) {
      return data.data;
    }

    // 按选择的时间段和顺序排序
    return [...data.data].sort((a, b) => {
      const aValue = getPercentForTimeFrame(a, selectedTimeFrame) || 0;
      const bValue = getPercentForTimeFrame(b, selectedTimeFrame) || 0;
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });
  }, [data?.data, selectedTimeFrame, sortOrder]);

  const handleSelectionChange = (timeFrame: TimeFrame | null, order: SortOrder | null) => {
    setSelectedTimeFrame(timeFrame);
    setSortOrder(order);
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return "N/A";
    return `${price}`;
  };
  if (symbol) {
    return <CoinDetail symbol={symbol} />;
  }
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search symbols..."
      searchBarAccessory={<PriceChangeDropdown onSelectionChange={handleSelectionChange} />}
    >
      {displayData.map((item) => {
        // 显示当前选择的时间段的百分比，如果没有选择则显示24h
        const displayTimeFrame = selectedTimeFrame || "24h";
        const currentPercent = getPercentForTimeFrame(item, displayTimeFrame);
        const isPositive = currentPercent > 0;

        return (
          <List.Item
            key={item.symbol}
            icon={
              item.symbolLogo
                ? { source: item.symbolLogo, mask: Image.Mask.Circle }
                : { source: Icon.Circle, mask: Image.Mask.Circle }
            }
            title={item.symbol}
            accessories={[
              {
                text: `💲 ${formatPrice(item.price)}`,
                tooltip: `Current Price: ${formatPrice(item.price)}`,
              },
              {
                text: `${isPositive ? "📈" : "📉"} ${formatPercentage(currentPercent)}`,
                tooltip: `${displayTimeFrame} Price Change: ${formatPercentage(currentPercent)}`,
                tag: isPositive ? { value: "🟢", color: "#00ff00" } : { value: "🔴", color: "#ff0000" },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" target={<CoinDetail symbol={item.symbol} />} icon={Icon.Info} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
