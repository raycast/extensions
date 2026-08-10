import "cross-fetch/polyfill";
import { useEffect, useRef, useState } from "react";

import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { fiat, LightningAddress } from "@getalby/lightning-tools";
import { connectWallet } from "../utils/wallet";

export default function PayToLightingAddress(props: { lightningAddress: string }) {
  const [lightningAddress] = useState(props.lightningAddress);
  const [lightningAddressInfo, setLightningAddressInfo] = useState<string | undefined>("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [commentAllowed, setCommentAllowed] = useState(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSatDenomination, setSatDenomination] = useState(true);

  const amountFieldRef = useRef<Form.TextField>(null);

  const fiatCurrency = getPreferenceValues<{ currency: string }>().currency;

  useEffect(() => {
    lookupLightningAddress();
    amountFieldRef.current?.focus();
  }, [lightningAddress]);

  const lookupLightningAddress = async () => {
    const lnAddress = new LightningAddress(lightningAddress);
    await lnAddress.fetch();
    setCommentAllowed(!!lnAddress.lnurlpData?.commentAllowed);
    setLightningAddressInfo(lnAddress.lnurlpData?.description);
  };

  const requestInvoice = async () => {
    let satoshis;

    if (isSatDenomination) {
      satoshis = parseInt(amount.trim(), 10);
    } else {
      satoshis = await fiat.getSatoshiValue({ amount: amount.trim(), currency: fiatCurrency });
    }
    if (isNaN(satoshis) || satoshis <= 0) {
      await showToast(Toast.Style.Failure, "Invalid amount");
      return;
    }
    const msats = satoshis * 1000;

    try {
      setLoading(true);
      const lnAddress = new LightningAddress(lightningAddress);
      await lnAddress.fetch();

      // Ensure the amount is within the valid range
      const min = lnAddress.lnurlpData?.min || 0;
      const max = lnAddress.lnurlpData?.max || 0;
      if (msats < min || msats > max) {
        await showToast(Toast.Style.Failure, `Amount must be between ${min} and ${max} satoshis.`);
        return;
      }
      // Request the invoice and update the state
      await showToast(Toast.Style.Animated, "Requesting Invoice...");
      const invoice = await lnAddress.requestInvoice({ satoshi: satoshis, comment });
      if (invoice.satoshi != satoshis) {
        await showToast(Toast.Style.Failure, `Invalid invoice amount ${invoice.satoshi} != ${satoshis} `);
        return;
      }
      return invoice;
    } catch (e) {
      console.error(e);
      await showToast(Toast.Style.Failure, `Failed to fetch invoice ${e instanceof Error ? e.message : ""} `);
    }
  };

  const handleCopyInvoice = async () => {
    setLoading(true);
    try {
      const invoice = await requestInvoice();
      if (invoice) {
        await Clipboard.copy(invoice?.paymentRequest);
        await showToast(Toast.Style.Success, "Invoice copied");
      }
    } catch (e) {
      console.error(e);
      await showToast(Toast.Style.Failure, `Failed to fetch invoice ${e instanceof Error ? e.message : ""} `);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPayment = async () => {
    setLoading(true);
    try {
      const invoice = await requestInvoice();
      if (!invoice) {
        return;
      }
      // Connect to wallet and send payment immediately after fetching the invoice
      const nwc = await connectWallet();
      await showToast(Toast.Style.Animated, "Sending Payment...");
      const response = await nwc.sendPayment(invoice.paymentRequest);

      // Check if the preimage is present, which indicates payment success
      if (response.preimage) {
        console.log("Payment sent successfully", response);
        await showToast(Toast.Style.Success, "Payment successful");
        await popToRoot();
      } else {
        console.error("Failed to send payment", response);
        await showToast(Toast.Style.Failure, "Failed to send Payment");
      }
      nwc.close();
    } catch (error) {
      console.error("Error sending payment", error);
      if (error instanceof Error) {
        await showToast(Toast.Style.Failure, "Error sending payment", error.message || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action title={`Send Payment to ${lightningAddress} `} onAction={handleSendPayment} />
          <Action title={`Copy Invoice`} onAction={handleCopyInvoice} />
          <Action
            title={`Swap Currency to ${isSatDenomination ? fiatCurrency : "satoshi"}`}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => setSatDenomination(!isSatDenomination)}
          />
        </ActionPanel>
      }
    >
      {lightningAddress && <Form.Description title="Lightning Address" text={lightningAddress} />}
      {lightningAddressInfo && <Form.Description title="Description" text={lightningAddressInfo} />}
      <Form.TextField
        id="amount"
        title={`Amount (${isSatDenomination ? "Satoshis" : fiatCurrency})`}
        placeholder={`Enter the amount in ${isSatDenomination ? "satoshi" : fiatCurrency}`}
        ref={amountFieldRef}
        autoFocus={true}
        value={amount}
        onChange={setAmount}
      />
      {commentAllowed && (
        <Form.TextField
          id="comment"
          title="Comment (optional)"
          placeholder="Enter a comment for the invoice"
          value={comment}
          onChange={setComment}
        />
      )}
    </Form>
  );
}
