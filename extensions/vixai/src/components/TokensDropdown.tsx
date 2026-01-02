import { Form, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import WalletAPI, { PortfolioToken } from "../api/wallet";
import { toastError } from "../utils/toast";
import { SolMint } from "../api/trading";

interface TokensDropdownProps {
  title?: string;
  placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemProps: any;
  onChange?: (value: PortfolioToken | undefined) => void;
  excludeSol?: boolean;
}

export function TokensDropdown({
  title = "Token",
  placeholder = "Select token",
  itemProps,
  onChange,
  excludeSol = false,
}: TokensDropdownProps) {
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    try {
      setIsLoading(true);
      const data = await WalletAPI.getPortfolio();
      setTokens(excludeSol ? data.tokens.filter((token) => token.address !== SolMint) : data.tokens);
    } catch (error) {
      await toastError(error, {
        title: "Error",
        message: "Failed to load portfolio data",
      });
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (itemProps.value && tokens.length > 0) {
      const token = tokens.find((token) => token.address === itemProps.value);
      if (!token) {
        toastError(new Error("insufficient token balance"), {
          title: "Insufficient token balance",
          message: "Not enough token balance to swap",
        });
      }
    }
  }, [itemProps.value, tokens]);

  const handleChange = (value: string) => {
    onChange?.(tokens.find((token) => token.address === value));
    itemProps.onChange?.(value);
  };

  return (
    <Form.Dropdown {...itemProps} onChange={handleChange} title={title} placeholder={placeholder} isLoading={isLoading}>
      {tokens.map((token) => (
        <Form.Dropdown.Item
          key={token.address}
          value={token.address}
          title={`${token.symbol} (Balance: ${token.amount_float})`}
          icon={{ source: token.logo, mask: Image.Mask.Circle }}
        />
      ))}
    </Form.Dropdown>
  );
}
