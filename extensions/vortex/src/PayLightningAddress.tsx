import "cross-fetch/polyfill";
import { useState, useEffect, useRef } from "react";

import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Clipboard } from "@raycast/api";
import { LightningAddress } from "@getalby/lightning-tools";
import { connectWallet } from "./wallet";

export default function PayToLightingAddress(props: { lightningAddress: string }) {
  const [lightningAddress] = useState(props.lightningAddress);
  const [lightningAddressInfo, setLightningAddressInfo] = useState<string | undefined>("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [commentAllowed, setCommentAllowed] = useState(true);
  const [loading, setLoading] = useState<boolean>(false);
  const amountFieldRef = useRef<Form.TextField>(null);

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
    const satoshis = parseInt(amount.trim(), 10);
    if (isNaN(satoshis) || satoshis <= 0) {
      showToast(Toast.Style.Failure, "Invalid amount");
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
        showToast(Toast.Style.Failure, `Amount must be between ${min} and ${max} satoshis.`);
        return;
      }
      // Request the invoice and update the state
      showToast(Toast.Style.Animated, "Requesting Invoice...");
      const invoice = await lnAddress.requestInvoice({ satoshi: satoshis, comment });
      if (invoice.satoshi != satoshis) {
        showToast(Toast.Style.Failure, `Invalid invoice amount ${invoice.satoshi} != ${satoshis} `);
        return;
      }
      return invoice;
    } catch (e) {
      console.error(e);
      showToast(Toast.Style.Failure, `Failed to fetch invoice ${e instanceof Error ? e.message : ""} `);
    }
  };

  const handleCopyInvoice = async () => {
    setLoading(true);
    try {
      const invoice = await requestInvoice();
      if (invoice) {
        await Clipboard.copy(invoice?.paymentRequest);
        showToast(Toast.Style.Success, "Invoice copied");
      }
    } catch (e) {
      console.error(e);
      showToast(Toast.Style.Failure, `Failed to fetch invoice ${e instanceof Error ? e.message : ""} `);
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
      showToast(Toast.Style.Animated, "Sending Payment...");
      const response = await nwc.sendPayment(invoice.paymentRequest);

      // Check if the preimage is present, which indicates payment success
      if (response.preimage) {
        console.log("Payment sent successfully", response);
        showToast(Toast.Style.Success, "Payment successful");
        popToRoot();
      } else {
        console.error("Failed to send payment", response);
        showToast(Toast.Style.Failure, "Failed to send Payment");
      }
      nwc.close();
    } catch (error) {
      console.error("Error sending payment", error);
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Error sending payment", error.message || error.message);
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
        </ActionPanel>
      }
    >
      {lightningAddress && <Form.Description title="Lightning Address" text={lightningAddress} />}
      {lightningAddressInfo && <Form.Description title="Description" text={lightningAddressInfo} />}
      <Form.TextField
        id="amount"
        title="Amount (Satoshis)"
        placeholder="Enter the amount in satoshis"
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
