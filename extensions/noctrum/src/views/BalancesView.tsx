import { List, Icon, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { WalletData } from "../lib/wallet";
import { fetchBalances } from "../lib/external-api";
import { getOnChainBalance, getEthBalance } from "../lib/chain";
import { COINS, tokenName } from "../lib/constants";
import { ethers } from "ethers";
import { PrivateBalance, errorMessage } from "../lib/types";

export function BalancesView({ wallet }: { wallet: WalletData }) {
  const [privateBalances, setPrivateBalances] = useState<PrivateBalance[]>([]);
  const [onChainBalances, setOnChainBalances] = useState<{ symbol: string; balance: string }[]>([]);
  const [ethBal, setEthBal] = useState("0");
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const [priv, ...onChain] = await Promise.all([
        fetchBalances(wallet),
        ...COINS.map(async (c) => ({
          symbol: c.symbol,
          balance: await getOnChainBalance(c.address, wallet.address),
        })),
      ]);
      const eth = await getEthBalance(wallet.address);
      console.log("private balances response:", JSON.stringify(priv));
      setPrivateBalances(priv.balances ?? []);
      setOnChainBalances(onChain);
      setEthBal(eth);
    } catch (e) {
      console.log(e);
      showToast(Toast.Style.Failure, "Error", errorMessage(e));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const fmt = (wei: string) => {
    try {
      return ethers.formatEther(wei);
    } catch {
      return wei;
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Private Vault Balances">
        {privateBalances.length === 0 && !isLoading && (
          <List.Item title="No private balances" icon={Icon.XMarkCircle} />
        )}
        {privateBalances.map((b, i) => (
          <List.Item
            key={i}
            title={tokenName(b.token)}
            subtitle={fmt(b.amount ?? b.balance)}
            icon={{ source: tokenName(b.token) === "nUSD" ? "nusd.png" : "neth.png" }}
            accessories={[{ text: "Private" }]}
          />
        ))}
      </List.Section>
      <List.Section title="On-Chain Balances">
        <List.Item
          title="MON"
          subtitle={fmt(ethBal)}
          icon={{ source: "monad.png" }}
          accessories={[{ text: "Native" }]}
        />
        {onChainBalances.map((b, i) => (
          <List.Item
            key={i}
            title={b.symbol}
            subtitle={fmt(b.balance)}
            icon={{ source: b.symbol === "nUSD" ? "nusd.png" : "neth.png" }}
            accessories={[{ text: "On-Chain" }]}
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={load} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
