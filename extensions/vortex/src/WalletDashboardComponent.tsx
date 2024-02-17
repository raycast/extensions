import React, { useEffect, useState } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { connectWallet } from "./wallet";
import "websocket-polyfill";
import * as crypto from "crypto";
globalThis.crypto = crypto as any;

export default function WalletDashboardComponent() {
  const [balance, setBalance] = useState<string | null>(null);

  const updateBalance = async () => {
    const nwc = await connectWallet(); // Ensure wallet is connected
    // Fetch the wallet balance using the getBalance method
    const balanceResponse = await nwc.getBalance();
    setBalance(balanceResponse.balance);
    nwc.close();
  };

  useEffect(() => {
    updateBalance();
  }, []); // Run only once on component mount

  return (
    <Detail
      markdown={`# Wallet Balance\n## Your balance is: ${`${balance} sats` ?? "Loading..."}`}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={updateBalance} />
        </ActionPanel>
      }
    />
  );
}
