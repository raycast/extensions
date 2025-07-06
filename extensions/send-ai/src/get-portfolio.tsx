import { ActionPanel, Action, List, showToast, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { executeAction, provider, createErrorToast, formatNumber, formatTokenBalance } from "./utils";
import { withAccessToken } from "@raycast/utils";
import { PortfolioToken } from "./type";
import GetTokenOverview from "./get-token-overview";

interface PortfolioData {
  wallet: string;
  totalUsd: number;
  items: PortfolioToken[];
}

function GetPortfolio() {
  const [isLoading, setIsLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    try {
      setIsLoading(true);
      const result = await executeAction("getPortfolio");
      const portfolioResult = result as { data: PortfolioData };
      setPortfolio(portfolioResult.data);
    } catch (error) {
      await showToast(createErrorToast("Error", error, "Failed to load portfolio"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading}>
      {portfolio && (
        <>
          <List.Item
            title="Portfolio Overview"
            subtitle={`Total Value: $${formatNumber(portfolio.totalUsd)}`}
            accessories={[{ text: `${portfolio.items.length} tokens` }]}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={loadPortfolio} />
              </ActionPanel>
            }
          />
          {portfolio.items.map((token) => (
            <List.Item
              key={token.address}
              title={token.symbol}
              subtitle={token.name}
              accessories={[
                { text: formatTokenBalance(token.uiAmount, token.symbol) },
                { text: `$${formatNumber(token.valueUsd)}` },
              ]}
              icon={{ source: token.logoURI, mask: Image.Mask.Circle }}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    target={<GetTokenOverview arguments={{ tokenAddress: token.address }} />}
                  />
                  <Action title="Refresh" onAction={loadPortfolio} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}

export default withAccessToken(provider)(GetPortfolio);
