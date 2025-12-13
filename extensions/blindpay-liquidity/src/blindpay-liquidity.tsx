import { useEffect, useState } from "react";
import { MenuBarExtra, open } from "@raycast/api";

type NetworkBalances = {
  USDC: string;
  USDT: string;
  USDB: string;
};

type TreasuryResponse = {
  polygon?: NetworkBalances;
  base?: NetworkBalances;
  arbitrum?: NetworkBalances;
  ethereum?: NetworkBalances;
  stellar?: NetworkBalances;
  base_sepolia?: NetworkBalances;
  polygon_amoy?: NetworkBalances;
  arbitrum_sepolia?: NetworkBalances;
  sepolia?: NetworkBalances;
  stellar_testnet?: NetworkBalances;
  tron?: NetworkBalances;
  solana?: NetworkBalances;
  solana_devnet?: NetworkBalances;
};

type SolanaBalance = {
  sol: string;
  usdc: string;
  usdt: string;
};

type TreasuryBalanceResponse = {
  response: TreasuryResponse;
  trxBalance: number;
  tronWalletsBalance: number;
  bankBalance: number;
  solanaBalance: SolanaBalance;
};

const formatBalance = (value: string | number | undefined): string => {
  if (value === undefined || value === null) return "0.00";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "0.00";
  return numValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

let lastFetchTime = 0;

const useLiquidityData = () => {
  const [data, setData] = useState<TreasuryBalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const now = Date.now();
      if (now - lastFetchTime < 15000) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("https://api.blindpay.com/i/treasury/balance");
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const jsonData = (await response.json()) as TreasuryBalanceResponse;
        setData(jsonData);
        lastFetchTime = Date.now();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch liquidity data");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { data, isLoading, error };
};

const hasNonZeroBalance = (balance: string | undefined): boolean => {
  if (!balance) return false;
  const numValue = parseFloat(balance);
  return !isNaN(numValue) && numValue > 0;
};

export default function Command() {
  const { data, isLoading, error } = useLiquidityData();

  if (error) {
    return (
      <MenuBarExtra icon="menu-bar-icon.png" isLoading={false}>
        <MenuBarExtra.Item title={`Error: ${error}`} onAction={() => open("https://app.blindpay.com/liquidity/")} />
      </MenuBarExtra>
    );
  }

  if (!data) {
    return <MenuBarExtra icon="menu-bar-icon.png" isLoading={isLoading} />;
  }

  const { response, bankBalance, trxBalance, tronWalletsBalance, solanaBalance } = data;

  return (
    <MenuBarExtra icon="menu-bar-icon.png" isLoading={isLoading}>
      {bankBalance > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Bank"
            subtitle={formatBalance(bankBalance)}
            onAction={() => open("https://app.blindpay.com/liquidity/")}
          />
        </MenuBarExtra.Section>
      )}

      {response.polygon && (hasNonZeroBalance(response.polygon.USDC) || hasNonZeroBalance(response.polygon.USDT)) && (
        <MenuBarExtra.Section>
          {hasNonZeroBalance(response.polygon.USDC) && (
            <MenuBarExtra.Item
              title="Polygon USDC"
              subtitle={formatBalance(response.polygon.USDC)}
              onAction={() => open("https://app.blindpay.com/liquidity/")}
            />
          )}
          {hasNonZeroBalance(response.polygon.USDT) && (
            <MenuBarExtra.Item
              title="Polygon USDT"
              subtitle={formatBalance(response.polygon.USDT)}
              onAction={() => open("https://app.blindpay.com/liquidity/")}
            />
          )}
        </MenuBarExtra.Section>
      )}

      {response.ethereum &&
        (hasNonZeroBalance(response.ethereum.USDC) || hasNonZeroBalance(response.ethereum.USDT)) && (
          <MenuBarExtra.Section>
            {hasNonZeroBalance(response.ethereum.USDC) && (
              <MenuBarExtra.Item
                title="Ethereum USDC"
                subtitle={formatBalance(response.ethereum.USDC)}
                onAction={() => open("https://app.blindpay.com/liquidity/")}
              />
            )}
            {hasNonZeroBalance(response.ethereum.USDT) && (
              <MenuBarExtra.Item
                title="Ethereum USDT"
                subtitle={formatBalance(response.ethereum.USDT)}
                onAction={() => open("https://app.blindpay.com/liquidity/")}
              />
            )}
          </MenuBarExtra.Section>
        )}

      {response.base && hasNonZeroBalance(response.base.USDC) && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Base USDC"
            subtitle={formatBalance(response.base.USDC)}
            onAction={() => open("https://app.blindpay.com/liquidity/")}
          />
        </MenuBarExtra.Section>
      )}

      {response.arbitrum && hasNonZeroBalance(response.arbitrum.USDC) && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Arbitrum USDC"
            subtitle={formatBalance(response.arbitrum.USDC)}
            onAction={() => open("https://app.blindpay.com/liquidity/")}
          />
        </MenuBarExtra.Section>
      )}

      {trxBalance > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Tron TRX"
            subtitle={formatBalance(trxBalance)}
            onAction={() => open("https://app.blindpay.com/liquidity/")}
          />
        </MenuBarExtra.Section>
      )}

      {tronWalletsBalance > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Tron Wallets USDT"
            subtitle={formatBalance(tronWalletsBalance)}
            onAction={() => open("https://app.blindpay.com/liquidity/")}
          />
        </MenuBarExtra.Section>
      )}

      {response.stellar && hasNonZeroBalance(response.stellar.USDC) && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Stellar USDC"
            subtitle={formatBalance(response.stellar.USDC)}
            onAction={() => open("https://app.blindpay.com/liquidity/")}
          />
        </MenuBarExtra.Section>
      )}

      {(solanaBalance.sol !== "0.00" || solanaBalance.usdc !== "0.00" || solanaBalance.usdt !== "0.00") &&
        (hasNonZeroBalance(solanaBalance.sol) ||
          hasNonZeroBalance(solanaBalance.usdc) ||
          hasNonZeroBalance(solanaBalance.usdt)) && (
          <MenuBarExtra.Section>
            {hasNonZeroBalance(solanaBalance.sol) && (
              <MenuBarExtra.Item
                title="Solana SOL"
                subtitle={formatBalance(solanaBalance.sol)}
                onAction={() => open("https://app.blindpay.com/liquidity/")}
              />
            )}
            {hasNonZeroBalance(solanaBalance.usdc) && (
              <MenuBarExtra.Item
                title="Solana USDC"
                subtitle={formatBalance(solanaBalance.usdc)}
                onAction={() => open("https://app.blindpay.com/liquidity/")}
              />
            )}
            {hasNonZeroBalance(solanaBalance.usdt) && (
              <MenuBarExtra.Item
                title="Solana USDT"
                subtitle={formatBalance(solanaBalance.usdt)}
                onAction={() => open("https://app.blindpay.com/liquidity/")}
              />
            )}
          </MenuBarExtra.Section>
        )}
    </MenuBarExtra>
  );
}
