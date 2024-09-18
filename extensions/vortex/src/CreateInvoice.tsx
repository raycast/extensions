import { setInterval } from "timers";
import { useState, useRef, useEffect } from "react";
import { Form, Detail, ActionPanel, Action, Icon, showToast, environment, Toast } from "@raycast/api";
import { toDataURL } from "qrcode";
import { webln } from "@getalby/sdk";

import ConnectionError from "./ConnectionError";
import { connectWallet } from "./wallet";

export default function CreateInvoice() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [invoice, setInvoice] = useState<string | undefined>();
  const [invoiceMarkdown, setInvoiceMarkdown] = useState<string | undefined>();
  const [invoiceState, setInvoiceState] = useState("pending");
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<unknown>(null);
  const invoiceCheckerIntervalRef = useRef<NodeJS.Timeout>();
  const invoiceCheckCounterRef = useRef(0);
  const nwc = useRef<webln.NostrWebLNProvider>();

  const checkInvoicePayment = (invoice: string) => {
    if (invoiceCheckerIntervalRef && invoiceCheckerIntervalRef.current) {
      clearInterval(invoiceCheckerIntervalRef.current);
    }
    invoiceCheckerIntervalRef.current = setInterval(async () => {
      if (!nwc.current || !nwc.current.lookupInvoice) {
        return;
      }
      showToast(Toast.Style.Animated, "Waiting for payment...");
      // just in case. don't poll too long
      if (invoiceCheckCounterRef.current > 210) {
        clearInterval(invoiceCheckerIntervalRef.current);
        showToast(Toast.Style.Success, "No longer checking for payments");
      }
      try {
        const response = await nwc.current.lookupInvoice({ paymentRequest: invoice });
        if (response.paid && response.preimage) {
          clearInterval(invoiceCheckerIntervalRef.current);
          setInvoiceState("paid");
          showToast(Toast.Style.Success, "Invoice paid");
        }
      } catch (e) {
        // ignore errors
      } finally {
        invoiceCheckCounterRef.current = invoiceCheckCounterRef.current + 1;
      }
    }, 1500);
  };

  const handleCreateInvoice = async () => {
    if (!amount) {
      showToast(Toast.Style.Failure, "Please specify an amount for the invoice.");
      return;
    }

    try {
      setLoading(true);
      nwc.current = await connectWallet();
      showToast(Toast.Style.Animated, "Requesting invoice...");
      const invoiceResponse = await nwc.current.makeInvoice({
        amount, // This should be the amount in satoshis
        defaultMemo: description,
      });

      if (invoiceResponse && invoiceResponse.paymentRequest) {
        setInvoice(invoiceResponse.paymentRequest);
        setInvoiceMarkdown(await getQRCodeMarkdownContent(invoiceResponse.paymentRequest));
        checkInvoicePayment(invoiceResponse.paymentRequest);
        showToast(Toast.Style.Success, "Invoice created");
      } else {
        showToast(Toast.Style.Failure, "Failed to create invoice");
      }
    } catch (error) {
      setConnectionError(error);
      showToast(Toast.Style.Failure, "Error creating invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (nwc.current) {
        nwc.current.close();
      }
      if (invoiceCheckerIntervalRef.current) {
        clearInterval(invoiceCheckerIntervalRef.current);
      }
    };
  }, []);

  async function getQRCodeMarkdownContent(invoice: string): Promise<string> {
    const qrCodeData = await toDataURL(`lightning:${invoice}`, {
      margin: 2,
      width: 300,
      color:
        environment.appearance === "light"
          ? {
              light: "#0000",
              dark: "#262426",
            }
          : { light: "#0000", dark: "#dedede" },
    });
    return `![](${qrCodeData})`;
  }

  if (connectionError) {
    return <ConnectionError error={connectionError} />;
  }

  return (
    <>
      {!invoice && (
        <Form
          isLoading={loading}
          actions={
            <ActionPanel>
              <Action title="Create Invoice" onAction={handleCreateInvoice} />
            </ActionPanel>
          }
        >
          <Form.TextField
            id="amount"
            title="Amount (Satoshis)"
            placeholder="Enter the amount in satoshis"
            value={amount}
            onChange={setAmount}
          />

          <Form.TextField
            id="description"
            title="Description"
            placeholder="Enter description"
            value={description}
            onChange={setDescription}
          />
        </Form>
      )}
      {invoice && (
        <Detail
          markdown={invoiceMarkdown}
          actions={
            <ActionPanel title="Invoice">
              <Action.CopyToClipboard title="Copy Invoice to Clipboard" content={invoice} />
            </ActionPanel>
          }
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="Amount" text={`${amount} sats`} icon={Icon.Bolt} />
              <Detail.Metadata.Label title="Description" text={description} />
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={invoiceState}
                  color={invoiceState == "paid" ? "green" : "#eed535"}
                />
              </Detail.Metadata.TagList>
            </Detail.Metadata>
          }
        />
      )}
    </>
  );
}
