import { ActionPanel, Action, showToast, Toast, Detail, LaunchProps, Color, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { isValidSolanaAddress } from "./utils/is-valid-address";
import { getPriceHistory } from "./utils/getPriceHistory";
import BuyTokenForm from "./views/buy-token-form";
import { RugcheckResult, TokenInfo } from "./type";
import SellToken from "./sell-token";

export const SOL_ADDRESS = "So11111111111111111111111111111111111111111";
export const WRAPPED_SOL_ADDRESS = "So11111111111111111111111111111111111111112";

function formatNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + "B";
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + "M";
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + "K";
  }
  return num.toFixed(2);
}

function formatPrice(price: number): string {
  return price < 0.01 ? price.toFixed(8) : price.toFixed(4);
}

function getMarkdown(
  tokenInfo: TokenInfo,
  tokenAddress: string,
  { chartDuration, chartDataUrl }: { chartDuration?: string; chartDataUrl?: string },
): string {
  return `# ${tokenInfo.name} (${tokenInfo.symbol})

### Token Address

\`\`\`
${tokenAddress}
\`\`\`

### Price Chart: ${chartDuration}

${chartDataUrl ? `![Chart](${chartDataUrl}?raycast-width=400&raycast-height=300)` : "No chart data available"}`;
}

const ChartDurationOptions = {
  "1M": {
    timeFrom: Math.floor(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).getTime() / 1000),
    timeTo: Math.floor(new Date().getTime() / 1000),
    timeInterval: "1D",
    title: "Last 1 Month",
  },
  "7D": {
    timeFrom: Math.floor(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).getTime() / 1000),
    timeTo: Math.floor(new Date().getTime() / 1000),
    timeInterval: "12H",
    title: "Last 7 Days",
  },
  "1D": {
    timeFrom: Math.floor(new Date(Date.now() - 1000 * 60 * 60 * 24).getTime() / 1000),
    timeTo: Math.floor(new Date().getTime() / 1000),
    timeInterval: "1H",
    title: "Last 1 Day",
  },
  "1H": {
    timeFrom: Math.floor(new Date(Date.now() - 1000 * 60 * 60).getTime() / 1000),
    timeTo: Math.floor(new Date().getTime() / 1000),
    timeInterval: "5m",
    title: "Last 1 Hour",
  },
};

const getTokenBalanceInWallet = async (tokenAddress: string): Promise<number> => {
  if (tokenAddress === WRAPPED_SOL_ADDRESS) {
    const result = await executeAction("getSolBalance", {}, true, 1000 * 60);
    return result.data as number;
  }
  const result = await executeAction(
    "getTokenBalance",
    {
      mintAddress: tokenAddress,
    },
    true,
    1000 * 60,
  );
  return result.data as number;
};

function GetTokenOverview(props: LaunchProps<{ arguments: { tokenAddress: string } }>) {
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [chartDataUrl, setChartDataUrl] = useState<string | undefined>(undefined);
  const [chartDurationLabel, setChartDurationLabel] = useState<string | undefined>(undefined);
  const [rugcheckData, setRugcheckData] = useState<RugcheckResult | undefined>(undefined);
  const [tokenBalance, setTokenBalance] = useState<number | undefined>(undefined);
  const [dailyVolume, setDailyVolume] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (props.arguments.tokenAddress) {
      let tokenAddress = props.arguments.tokenAddress;
      if (tokenAddress === SOL_ADDRESS) {
        tokenAddress = WRAPPED_SOL_ADDRESS;
      }
      setTokenAddress(tokenAddress);
      loadTokenOverview({ tokenAddress: tokenAddress });
    }
  }, [props.arguments.tokenAddress]);

  async function loadTokenOverview(values: { tokenAddress: string }) {
    try {
      setIsLoading(true);
      setTokenAddress(values.tokenAddress);

      if (!values.tokenAddress || values.tokenAddress.trim() === "") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid token address",
          message: "Please enter a valid token address",
        });
        return;
      }

      let finalTokenAddress = values.tokenAddress;
      let tokenInfo: TokenInfo;

      if (isValidSolanaAddress(values.tokenAddress)) {
        const result = await executeAction(
          "getToken",
          {
            tokenId: values.tokenAddress,
          },
          true,
          1000 * 60 * 5,
        );
        tokenInfo = result.data as TokenInfo;
        try {
          const { data } = await executeAction(
            "getTokenDataByTicker",
            {
              ticker: tokenInfo.symbol, // this is the token symbol
            },
            true,
            1000 * 60 * 60,
          );
          setDailyVolume((data as { daily_volume: number }).daily_volume);
        } catch (error) {
          console.error(error);
        }
      } else {
        // if starts with $, remove the $
        if (values.tokenAddress.startsWith("$")) {
          values.tokenAddress = values.tokenAddress.slice(1);
        }
        const { data } = await executeAction(
          "getTokenDataByTicker",
          {
            ticker: values.tokenAddress, // this is the token symbol
          },
          true,
          1000 * 60 * 60,
        );

        finalTokenAddress = (data as { address: string }).address;
        setDailyVolume((data as { daily_volume: number }).daily_volume);
        const { data: tokenInfoData } = (await executeAction(
          "getToken",
          {
            tokenId: finalTokenAddress,
          },
          true,
          1000 * 60 * 5,
        )) as { data: TokenInfo };
        tokenInfo = tokenInfoData;
      }

      setTokenInfo(tokenInfo);
      setTokenAddress(finalTokenAddress);

      const tokenBalance = await getTokenBalanceInWallet(finalTokenAddress);
      setTokenBalance(tokenBalance);

      // Fetch price history chart
      try {
        const chart = await getPriceHistory({
          address: finalTokenAddress,
          timeFrom: Math.floor(new Date(Date.now() - 1000 * 60 * 60 * 24).getTime() / 1000),
          timeTo: Math.floor(new Date().getTime() / 1000),
          timeInterval: "1H",
          size: "large",
        });
        setChartDataUrl(chart.data?.chartImageUrl);
        setChartDurationLabel(ChartDurationOptions["1D"].title);
      } catch (chartError) {
        showFailureToast(chartError, { title: "Error fetching chart" });
      }

      setIsLoading(false);

      try {
        const rugcheck = await executeAction(
          "rugcheck",
          {
            tokenAddress: finalTokenAddress,
          },
          true,
          1000 * 60 * 60 * 24,
        );
        setRugcheckData(rugcheck as RugcheckResult);
      } catch (rugcheckError) {
        showFailureToast(rugcheckError, { title: "Error fetching rugcheck" });
      }
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to get token information",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadChart(duration: keyof typeof ChartDurationOptions) {
    const { timeFrom, timeTo, timeInterval, title } = ChartDurationOptions[duration];
    const chart = await getPriceHistory({
      address: tokenAddress,
      timeFrom,
      timeTo,
      timeInterval,
      size: "large",
    });
    setChartDataUrl(chart.data?.chartImageUrl);
    setChartDurationLabel(title);
  }

  if (isLoading) {
    return <Detail markdown="Loading..." isLoading={isLoading} />;
  }

  if (!tokenInfo) {
    return (
      <Detail
        markdown="### Token Overview\n\nEnter a token address or ticker symbol as an argument to view token information."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={() => tokenAddress && loadTokenOverview({ tokenAddress })} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown(tokenInfo, tokenAddress, { chartDataUrl, chartDuration: chartDurationLabel })}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Symbol">
            <Detail.Metadata.TagList.Item
              icon={{ source: tokenInfo.image || "", mask: Image.Mask.Circle }}
              text={tokenInfo.symbol}
              color={Color.PrimaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Your Balance" text={`${tokenBalance?.toLocaleString()} ${tokenInfo.symbol}`} />
          <Detail.Metadata.Label title="Price" text={`$${formatPrice(tokenInfo.price)}`} />
          {dailyVolume && <Detail.Metadata.Label title="Daily Volume" text={`$${formatNumber(dailyVolume)}`} />}
          <Detail.Metadata.Label title="Market Cap" text={`$${formatNumber(tokenInfo.marketCap)}`} />
          <Detail.Metadata.Label title="FDV" text={`$${formatNumber(tokenInfo.fdv)}`} />
          <Detail.Metadata.Label title="Liquidity" text={`$${formatNumber(tokenInfo.liquidity)}`} />
          <Detail.Metadata.Label title="Holders" text={tokenInfo.holder.toLocaleString()} />
          <Detail.Metadata.Label title="Decimals" text={tokenInfo.decimals.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Price Changes" />
          <Detail.Metadata.Label
            title="1 minute"
            text={{
              value: `${tokenInfo.priceChange["1 minute"] > 0 ? "+" : ""}${tokenInfo.priceChange["1 minute"].toFixed(2)}%`,
              color: tokenInfo.priceChange["1 minute"] > 0 ? Color.Green : Color.Red,
            }}
          />
          <Detail.Metadata.Label
            title="30 minutes"
            text={{
              value: `${tokenInfo.priceChange["30 minutes"] > 0 ? "+" : ""}${tokenInfo.priceChange["30 minutes"].toFixed(2)}%`,
              color: tokenInfo.priceChange["30 minutes"] > 0 ? Color.Green : Color.Red,
            }}
          />
          <Detail.Metadata.Label
            title="1 hour"
            text={{
              value: `${tokenInfo.priceChange["1 hour"] > 0 ? "+" : ""}${tokenInfo.priceChange["1 hour"].toFixed(2)}%`,
              color: tokenInfo.priceChange["1 hour"] > 0 ? Color.Green : Color.Red,
            }}
          />
          <Detail.Metadata.Label
            title="6 hours"
            text={{
              value: `${tokenInfo.priceChange["6 hours"] > 0 ? "+" : ""}${tokenInfo.priceChange["6 hours"].toFixed(2)}%`,
              color: tokenInfo.priceChange["6 hours"] > 0 ? Color.Green : Color.Red,
            }}
          />
          <Detail.Metadata.Label
            title="12 hours"
            text={{
              value: `${tokenInfo.priceChange["12 hours"] > 0 ? "+" : ""}${tokenInfo.priceChange["12 hours"].toFixed(2)}%`,
              color: tokenInfo.priceChange["12 hours"] > 0 ? Color.Green : Color.Red,
            }}
          />
          <Detail.Metadata.Label
            title="24 hours"
            text={{
              value: `${tokenInfo.priceChange["24 hours"] > 0 ? "+" : ""}${tokenInfo.priceChange["24 hours"].toFixed(2)}%`,
              color: tokenInfo.priceChange["24 hours"] > 0 ? Color.Green : Color.Red,
            }}
          />

          {(tokenInfo.website || tokenInfo.twitter) && (
            <>
              <Detail.Metadata.Separator />
              {tokenInfo.website && (
                <Detail.Metadata.Link title="Website" text={tokenInfo.website} target={tokenInfo.website} />
              )}
              {tokenInfo.twitter && (
                <Detail.Metadata.Link title="Twitter" text={tokenInfo.twitter} target={tokenInfo.twitter} />
              )}
            </>
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Security Analysis"
            text={{
              value: rugcheckData?.data.score || "N/A",
              color:
                rugcheckData?.data.score === "safe"
                  ? Color.Green
                  : rugcheckData?.data.score === "warning"
                    ? Color.Yellow
                    : Color.Red,
            }}
            icon={{
              source: rugcheckData?.data.score === "safe" ? "🟢" : rugcheckData?.data.score === "warning" ? "🟡" : "🔴",
              mask: Image.Mask.Circle,
            }}
          />
          <Detail.Metadata.Label title="Rugcheck Token Program" text={rugcheckData?.data.tokenProgram || "N/A"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Last Updated" text={new Date().toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push title="Buy" target={<BuyTokenForm arguments={{ outputMint: tokenAddress }} />} />
          <Action.Push
            title="Sell"
            target={
              <SellToken
                arguments={{
                  inputMint: tokenAddress,
                  inputAmount: tokenBalance?.toString() ?? "",
                  dontAutoExecute: true,
                }}
              />
            }
          />
          <Action title="Refresh" onAction={() => loadTokenOverview({ tokenAddress })} />
          <Action title="View Last 1 Month Chart" onAction={() => loadChart("1M")} />
          <Action title="View Last 7 Days Chart" onAction={() => loadChart("7D")} />
          <Action title="View Last 1 Day Chart" onAction={() => loadChart("1D")} />
          <Action title="View Last 1 Hour Chart" onAction={() => loadChart("1H")} />
          <Action.CopyToClipboard title="Copy Address" content={tokenAddress} />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(provider)(GetTokenOverview);
