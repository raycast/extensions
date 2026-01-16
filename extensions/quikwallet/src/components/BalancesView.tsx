import { List, Detail, Icon, Color } from "@raycast/api";
import { BalancesViewProps } from "../types";
import { useSolanaBalance, useSplTokenBalances, useSolanaPrice } from "../hooks";
import { useTokenPrices } from "../hooks/useTokenPrices";
import { formatTokenBalance, getTokenIcon } from "../utils/formatters";
import { SendForm } from "./SendForm";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CommonActionPanelItems } from "./common/ActionPanelItems";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 120) return "1 minute ago";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return "1 hour ago";
  return `${Math.floor(seconds / 3600)} hours ago`;
}

function getPriceChangeIcon(priceChange: number): { source: Icon; tintColor: Color } | undefined {
  if (priceChange > 0) {
    return { source: Icon.ArrowUp, tintColor: Color.Green };
  } else if (priceChange < 0) {
    return { source: Icon.ArrowDown, tintColor: Color.Red };
  }
  return undefined;
}

export function BalancesView({ walletAddress, onChangeWallet }: BalancesViewProps) {
  const queryClient = useQueryClient();
  const { balance: solBalance, isLoading: isLoadingSol, error: errorSol } = useSolanaBalance(walletAddress);
  const { tokenBalances, isLoading: isLoadingTokens, error: errorTokens } = useSplTokenBalances(walletAddress);
  const { price: solPrice, priceChange24h, isLoading: isLoadingPrice } = useSolanaPrice();
  const { tokenPrices, isLoading: isLoadingTokenPrices } = useTokenPrices(tokenBalances);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const isLoading = isLoadingSol || isLoadingTokens || isLoadingPrice || isLoadingTokenPrices;
  const combinedError = errorSol || errorTokens;

  const handleRefresh = async () => {
    setLastRefreshed(new Date());
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["solanaBalance", walletAddress],
        refetchType: "active",
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: ["splTokenBalances", walletAddress],
        refetchType: "active",
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: ["solanaPrice"],
        refetchType: "active",
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: ["tokenPrice"],
        refetchType: "active",
      }),
    ]);
  };

  if (combinedError) {
    const errorMessage =
      typeof combinedError === "string" ? combinedError : (combinedError as Error).message || "Unknown error";
    return <Detail markdown={`# Error\n\nCould not fetch balances: ${errorMessage}`} />;
  }

  const refreshStatus = isLoading ? "Refreshing..." : `Last updated ${formatTimeAgo(lastRefreshed)}`;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tokens..." navigationTitle={refreshStatus}>
      <List.Section title="Native Balance (SOL)" subtitle={refreshStatus}>
        {solBalance !== null && (
          <List.Item
            title="SOL"
            icon={getTokenIcon("SOL")}
            subtitle={`$${solPrice.toFixed(2)} per SOL (${priceChange24h.toFixed(2)}% 24h)`}
            accessories={[
              {
                text: `${formatTokenBalance(solBalance, 9)} SOL ($${formatTokenBalance(solBalance * solPrice, 2)})`,
                icon: isLoading
                  ? { source: Icon.ArrowClockwise, tintColor: Color.Blue }
                  : getPriceChangeIcon(priceChange24h),
              },
            ]}
            actions={
              <CommonActionPanelItems
                onRefresh={handleRefresh}
                onChangeWallet={onChangeWallet}
                copyItems={[
                  { title: "Copy Balance", content: solBalance.toString() },
                  { title: "Copy USD Value", content: `$${formatTokenBalance(solBalance * solPrice, 2)}` },
                  { title: "Copy Wallet Address", content: walletAddress },
                ]}
                pushTarget={<SendForm tokenSymbol="SOL" senderAddress={walletAddress} tokenDecimals={9} />}
                pushTitle="Send Sol"
              />
            }
          />
        )}
      </List.Section>
      <List.Section title="Token Balances" subtitle={refreshStatus}>
        {tokenBalances.map((token) => {
          const { price: tokenPrice, priceChange24h: tokenPriceChange24h } = tokenPrices[token.mintAddress] || {
            price: 0,
            priceChange24h: 0,
          };
          const usdValue = token.uiAmount * tokenPrice;

          return (
            <List.Item
              key={token.mintAddress}
              title={token.symbol}
              icon={getTokenIcon(token.symbol)}
              subtitle={
                tokenPrice > 0
                  ? `$${tokenPrice.toFixed(2)} per ${token.symbol} (${tokenPriceChange24h.toFixed(2)}% 24h)`
                  : token.name
              }
              accessories={[
                {
                  text: `${formatTokenBalance(token.uiAmount, token.decimals)} ${token.symbol}${
                    tokenPrice > 0 ? ` ($${formatTokenBalance(usdValue, 2)})` : ""
                  }`,
                  icon: isLoading
                    ? { source: Icon.ArrowClockwise, tintColor: Color.Blue }
                    : getPriceChangeIcon(tokenPriceChange24h),
                },
              ]}
              actions={
                <CommonActionPanelItems
                  onRefresh={handleRefresh}
                  onChangeWallet={onChangeWallet}
                  copyItems={[
                    { title: "Copy Balance", content: token.uiAmount.toString() },
                    ...(tokenPrice > 0
                      ? [{ title: "Copy USD Value", content: `$${formatTokenBalance(usdValue, 2)}` }]
                      : []),
                    { title: "Copy Token Address", content: token.mintAddress },
                  ]}
                  pushTarget={
                    <SendForm
                      tokenSymbol={token.symbol}
                      mintAddress={token.mintAddress}
                      senderAddress={walletAddress}
                      tokenDecimals={token.decimals}
                    />
                  }
                  pushTitle={`Send ${token.symbol}`}
                />
              }
            />
          );
        })}
      </List.Section>
      {!isLoading && tokenBalances.length === 0 && solBalance === null && !combinedError && (
        <List.EmptyView
          title="No Balances Found"
          description={`No SOL or token balances found for ${walletAddress}. Ensure the address is correct and has activity.`}
        />
      )}
    </List>
  );
}
