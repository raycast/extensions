import "cross-fetch/polyfill";
import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { Invoice } from "@getalby/lightning-tools";

import { connectWallet } from "../utils/wallet";

export default function PayInvoice(props: { invoice: string }) {
  const [invoice, setInvoice] = useState(props.invoice);
  const [amount, setAmount] = useState<string | undefined>();
  const [description, setDescription] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    inspectInvoice(invoice);
  }, [invoice]);

  const inspectInvoice = async (bolt11: string) => {
    if (!bolt11 || !bolt11.toLowerCase().startsWith("lnbc")) {
      setAmount(undefined);
      setDescription(undefined);
      return;
    }
    try {
      const invoice = new Invoice({ pr: bolt11 });
      if (!invoice.satoshi || invoice.satoshi < 1) {
        await showToast(Toast.Style.Failure, "Invoice does not contain an amount");
        return;
      }
      setAmount(`${new Intl.NumberFormat().format(invoice.satoshi)} sats`);
      if (invoice.description) {
        setDescription(invoice.description);
      }
    } catch (e) {
      console.error(e);
      // ignore invalid invoices
    }
  };

  const handlePayment = async () => {
    if (!amount) {
      await showToast(Toast.Style.Failure, `Invalid invoice?`);
      return;
    }
    try {
      setLoading(true);
      const nwc = await connectWallet(); // Ensure wallet is connected
      await showToast(Toast.Style.Animated, "Sending payment...");
      const response = await nwc.sendPayment(invoice); // Send payment
      await showToast(Toast.Style.Success, "Payment successful", `Preimage: ${response.preimage}`);
      await popToRoot();
      nwc.close();
    } catch (error) {
      console.error("Payment failed:", error);
      await showToast(Toast.Style.Failure, `Payment failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Form
        isLoading={loading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Pay Invoice" onSubmit={handlePayment} />
          </ActionPanel>
        }
      >
        <Form.TextField id="invice" title="Invoice" value={invoice} onChange={setInvoice} />
        {amount && (
          <>
            <Form.Separator />
            <Form.Description text={`⚡️ ${amount} ${description ? `for ${description}` : ""}`} />
            <Form.Separator />
          </>
        )}
      </Form>
    </>
  );
}
