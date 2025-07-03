import { Form, Image, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { PortfolioToken } from "../type";
import { executeAction, createErrorToast } from "../utils";

interface OwnedTokensDropdownProps {
  title?: string;
  placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemProps: any;
  onPortfolioRefresh?: () => void;
  onChange?: (value: string) => void;
}

export function OwnedTokensDropdown({
  title = "Token",
  placeholder = "Select token from portfolio",
  itemProps,
  onPortfolioRefresh,
  onChange,
}: OwnedTokensDropdownProps) {
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    try {
      setIsLoading(true);
      const result = await executeAction("getPortfolio", {}, true, 60 * 1000); // 1 minute cache
      const portfolioResult = result as { data: { items: PortfolioToken[] } };

      if (portfolioResult?.data?.items && Array.isArray(portfolioResult.data.items)) {
        setPortfolioTokens(portfolioResult.data.items);
      } else {
        setPortfolioTokens([]);
      }
    } catch (error) {
      console.error("Error loading portfolio:", error);
      await showToast(createErrorToast("Error", error, "Failed to load portfolio data"));
      setPortfolioTokens([]);
    } finally {
      setIsLoading(false);
      onPortfolioRefresh?.();
    }
  }

  const handleChange = (value: string) => {
    onChange?.(value);
    itemProps.onChange?.(value);
  };

  return (
    <Form.Dropdown {...itemProps} onChange={handleChange} title={title} placeholder={placeholder} isLoading={isLoading}>
      {portfolioTokens.map((token) => (
        <Form.Dropdown.Item
          key={token.address}
          value={token.address}
          title={`${token.symbol} (Balance: ${token.uiAmount.toFixed(4)})`}
          icon={{ source: token.logoURI, mask: Image.Mask.Circle }}
        />
      ))}
    </Form.Dropdown>
  );
}
