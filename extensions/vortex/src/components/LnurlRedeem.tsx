import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { connectWallet } from "../utils/wallet";
import { ParsedLNURLData } from "../types";
import { useState } from "react";
import ConnectionError from "./ConnectionError";
import { MSATS_PER_SAT } from "../constants";

export default function LnurlRedeem({ redeemData }: { redeemData: ParsedLNURLData }) {
  const [isLoading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [amount, setAmount] = useState(redeemData.maxWithdrawable / MSATS_PER_SAT);

  async function handleWithdraw(lnInfo: ParsedLNURLData, amount: number) {
    if (!lnInfo) {
      throw new Error("Lightning info is missing");
    }
    if (amount < lnInfo.minWithdrawable / MSATS_PER_SAT || amount > lnInfo.maxWithdrawable / MSATS_PER_SAT) {
      await showToast(Toast.Style.Failure, "Invalid withdrawal amount");
      return;
    }

    setLoading(true);
    try {
      await showToast(Toast.Style.Animated, "Processing Withdrawal...");
      const nwc = await connectWallet();

      if (!nwc) {
        setConnectionError(true);
        return;
      }

      const invoice = await nwc.makeInvoice({ amount: amount, defaultDescription: defaultDescription });

      const withdrawResponse = await fetch(`${lnInfo.callback}?k1=${lnInfo.k1}&pr=${invoice.paymentRequest}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!withdrawResponse.ok) {
        throw new Error(`HTTP error: ${withdrawResponse.status}`);
      }

      const result = await withdrawResponse.json();

      if (result.status === "OK") {
        await showToast(Toast.Style.Success, "Success!");
        setAmount(0);
        await popToRoot({ clearSearchBar: true });
      } else {
        throw new Error(result.reason || "Withdrawal failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Withdrawal failed";
      await showToast(Toast.Style.Failure, errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (connectionError) {
    return <ConnectionError error={connectionError} />;
  }

  const { maxWithdrawable, minWithdrawable, defaultDescription } = redeemData;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Withdraw" onAction={() => handleWithdraw(redeemData, amount)} />
          <Action title="Withdraw Max" onAction={() => handleWithdraw(redeemData, maxWithdrawable / MSATS_PER_SAT)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="amount"
        title="Amount to Withdraw"
        placeholder="Enter amount"
        value={amount.toString() || (maxWithdrawable / MSATS_PER_SAT).toString()}
        onChange={(newValue) => setAmount(Number(newValue))}
      />

      <Form.Separator />
      <Form.Description
        title="LNURL Voucher Details"
        text={`
            Max Withdraw: ⚡ ${maxWithdrawable / MSATS_PER_SAT} sats
            Min Witthdraw: ⚡ ${minWithdrawable / MSATS_PER_SAT} sats
            Description: ${defaultDescription ?? "Lnurl Voucher withdraw via Vortex"}
        `}
      />
    </Form>
  );
}
