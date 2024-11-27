import "cross-fetch/polyfill";
import { useEffect, useState } from "react";
import { ActionPanel, Detail, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { fiat } from "@getalby/lightning-tools";
import { connectWallet } from "./wallet";
import ConnectionError from "./ConnectionError";

export default function ShowBalance() {
  const [balance, setBalance] = useState("");
  const [fiatBalance, setFiatBalance] = useState("");
  const [connectionError, setConnectionError] = useState<unknown>(null);

  const updateBalance = async () => {
    const fiatCurrency = getPreferenceValues<{ currency: string }>().currency;

    try {
      const nwc = await connectWallet(); // Connect and get the wallet instance
      const balanceInfo = await nwc.getBalance(); // Fetch the balance from the connected wallet
      const fiatBalance = await fiat.getFormattedFiatValue({
        satoshi: balanceInfo.balance,
        currency: fiatCurrency,
        locale: "en",
      });
      setBalance(`${new Intl.NumberFormat().format(balanceInfo.balance)} sats`);
      setFiatBalance(fiatBalance);
    } catch (error) {
      setConnectionError(error);
      showToast(Toast.Style.Failure, "Failed to fetch wallet balance");
    }
  };

  useEffect(() => {
    updateBalance(); // Fetch balance when component mounts
  }, []); // Run only once on component mount

  if (connectionError) {
    return <ConnectionError error={connectionError} />;
  }

  return (
    <Detail
      isLoading={!balance}
      markdown={`# Wallet Balance\nYour balance is: ${balance} ${fiatBalance}`}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={updateBalance} />
        </ActionPanel>
      }
    />
  );
}
