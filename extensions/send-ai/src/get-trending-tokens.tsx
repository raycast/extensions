import { ActionPanel, Action, List, showToast, Toast, Image, Color, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { withAccessToken } from "@raycast/utils";
import BuyTokenForm from "./views/buy-token-form";
import { getPriceHistory } from "./utils/getPriceHistory";

interface Token {
  address: string;
  decimals: number;
  liquidity: number;
  logoURI: string;
  name: string;
  symbol: string;
  volume24hUSD: number;
  volume24hChangePercent: number;
  fdv: number;
  marketcap: number;
  rank: number;
  price: number;
  price24hChangePercent: number;
}

function formatNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9)?.toFixed(2) + "B";
  } else if (num >= 1e6) {
    return (num / 1e6)?.toFixed(2) + "M";
  } else if (num >= 1e3) {
    return (num / 1e3)?.toFixed(2) + "K";
  }
  return num?.toFixed(2) ?? "0";
}

function formatPrice(price: number): string {
  return price < 0.01 ? price.toFixed(8) : price.toFixed(4);
}

const getChartDataUrl = async (tokenAddress: string) => {
  const chart = await getPriceHistory({
    address: tokenAddress,
    timeFrom: Math.floor(new Date(Date.now() - 1000 * 60 * 60 * 24).getTime() / 1000),
    timeTo: Math.floor(new Date().getTime() / 1000),
    timeInterval: "1H",
  });
  return chart.data?.chartImageUrl;
};
const getMarkDown = (selectedToken: Token, chartDataUrl?: string) => {
  return `![${selectedToken.name}](${chartDataUrl})`;
};

const TokenDetailMetadata = ({ token }: { token: Token }) => {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Rank" text={`#${token.rank}`} />
      <List.Item.Detail.Metadata.Label title="Address" text={token.address} />
      <List.Item.Detail.Metadata.Label title="Symbol" text={token.symbol} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Price" text={`$${formatPrice(token.price)}`} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Market Cap" text={`$${formatNumber(token.marketcap)}`} />
      <List.Item.Detail.Metadata.Label title="FDV" text={`$${formatNumber(token.fdv)}`} />
      <List.Item.Detail.Metadata.Label title="Liquidity" text={`$${formatNumber(token.liquidity)}`} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="24h Volume" text={`$${formatNumber(token.volume24hUSD)}`} />
      <List.Item.Detail.Metadata.Label
        title="Volume Change"
        text={`${token.volume24hChangePercent > 0 ? "+" : ""}${token.volume24hChangePercent?.toFixed(2)}%`}
      />
      <List.Item.Detail.Metadata.Label
        title="Price Change"
        text={`${token.price24hChangePercent > 0 ? "+" : ""}${token.price24hChangePercent?.toFixed(2)}%`}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Decimals" text={`${token.decimals}`} />
    </List.Item.Detail.Metadata>
  );
};

const TokenDetail = ({ token }: { token: Token }) => {
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      const url = await getChartDataUrl(token.address);
      const markdown = getMarkDown(token, url);
      setMarkdownContent(markdown);
      setIsLoading(false);
    };
    loadChartData();
  }, [token.address]);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={<TokenDetailMetadata token={token} />}
      markdown={markdownContent}
    />
  );
};

const GetTrendingTokens = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  useEffect(() => {
    loadTrendingTokens();
  }, []);

  async function loadTrendingTokens(isReload: boolean = false) {
    try {
      setIsLoading(true);
      const result = await executeAction("getTrendingTokens", {}, !isReload, 1000 * 60 * 5);
      setTokens(result.data as Token[]);
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load trending tokens",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const getAccessories = (token: Token) => {
    if (selectedToken) {
      return [{ text: `#${token.rank}` }];
    }
    return [
      { text: `$${formatPrice(token.price)}` },
      {
        text: {
          value: `${token.price24hChangePercent > 0 ? "+" : ""}${token.price24hChangePercent.toFixed(1)}%`,
          color: token.price24hChangePercent > 0 ? Color.Green : Color.Red,
          icon: token.price24hChangePercent > 0 ? Icon.ArrowUp : Icon.ArrowDown,
        },
      },
      { text: `#${token.rank}` },
    ];
  };

  return (
    <List isLoading={isLoading} isShowingDetail={!!selectedToken}>
      {tokens.map((token) => (
        <List.Item
          key={token.address}
          title={token.name}
          subtitle={!selectedToken ? `$${formatNumber(token.marketcap)}` : undefined}
          detail={<TokenDetail token={token} />}
          accessories={getAccessories(token)}
          icon={{ source: token.logoURI, mask: Image.Mask.RoundedRectangle }}
          actions={
            <ActionPanel>
              <Action.Push title="Buy" target={<BuyTokenForm arguments={{ outputMint: token.address }} />} />
              {!selectedToken && <Action title="Show Details" onAction={() => setSelectedToken(token)} />}
              <Action title="Hide Details" onAction={() => setSelectedToken(null)} />
              <Action title="Refresh" onAction={() => loadTrendingTokens(true)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default withAccessToken(provider)(GetTrendingTokens);
