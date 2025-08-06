import { ActionPanel, Action, List, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { withAccessToken } from "@raycast/utils";
import SellToken from "./sell-token";
import WalletAPI, { PortfolioData } from "./api/wallet";
import BuyToken from "./buy-token";
import { toastError } from "./utils/toast";
import { provider } from "./auth/provider";
import { formatNumber, formatTokenBalance } from "./utils/format";
import { SolMint } from "./api/trading";

function GetPortfolio() {
  const [isLoading, setIsLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioData>();

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    try {
      setIsLoading(true);
      const data = await WalletAPI.getPortfolio();
      setPortfolio(data);
    } catch (error) {
      await toastError(error, {
        title: "Error",
        message: "Failed to load portfolio",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Wallet Portfolio">
      {portfolio && (
        <>
          <List.Item
            title="Wallet Portfolio"
            subtitle={portfolio.address}
            accessories={[{ text: `$${formatNumber(portfolio.total_usd)}` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Wallet Address" content={portfolio.address} />
                <Action title="Refresh" onAction={loadPortfolio} />
              </ActionPanel>
            }
          />

          {portfolio.tokens.map((token) => {
            return (
              <List.Item
                key={token.address}
                title={token.symbol}
                subtitle={`${token.name} - $${formatNumber(token.usd_price)}`}
                accessories={[
                  { text: formatTokenBalance(Number(token.amount_float), token.symbol) },
                  { text: `$${formatNumber(token.usd_amount)}` },
                ]}
                icon={{ source: token.logo, mask: Image.Mask.Circle }}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Token Address" content={token.address} />
                    {token.address != SolMint && (
                      <Action.Push
                        title="Sell"
                        target={
                          <SellToken
                            arguments={{
                              inputMint: token.address,
                              inputAmount: token.amount_float,
                              dontAutoExecute: true,
                            }}
                          />
                        }
                      />
                    )}
                    {token.address != SolMint && (
                      <Action.Push title="Buy More" target={<BuyToken arguments={{ outputMint: token.address }} />} />
                    )}
                    <Action title="Refresh" onAction={loadPortfolio} />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}

export default withAccessToken(provider)(GetPortfolio);
