import React, { useEffect, useState } from "react";
import { ActionPanel, Detail, Action, showToast, Toast } from "@raycast/api";
import { connectWallet } from "./wallet";

export default function ShowBalance() {
  const [balance, setBalance] = useState<string | null>(null);

  const updateBalance = async () => {
    try {
      const nwc = await connectWallet(); // Connect and get the wallet instance
      const balanceInfo = await nwc.getBalance(); // Fetch the balance from the connected wallet
      setBalance(`${new Intl.NumberFormat().format(balanceInfo.balance)} sats`);
    } catch (error) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Failed to fetch wallet balance", error.message);
      }
      console.error("Failed to fetch wallet balance:", error);
    }
  };

  useEffect(() => {
    updateBalance(); // Fetch balance when component mounts
  }, []); // Run only once on component mount

  return (
    <Detail
      markdown={`# Wallet Balance\nYour balance is: ${balance ?? "Loading..."}`}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={updateBalance} />
        </ActionPanel>
      }
    />
  );
}
