import { setInterval } from "timers";
import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { toDataURL } from "qrcode";
import { webln } from "@getalby/sdk";

import ConnectionError from "./components/ConnectionError";
import { connectWallet } from "./utils/wallet";
import { fiat } from "@getalby/lightning-tools";
import "cross-fetch/polyfill";

export default function CreateInvoice(props: LaunchProps<{ arguments: Arguments.Createinvoice }>) {
  const [amount, setAmount] = useState<string>(props.arguments.input);
  const [description, setDescription] = useState("");
  const [invoice, setInvoice] = useState<string | undefined>();
  const [invoiceMarkdown, setInvoiceMarkdown] = useState<string | undefined>();
  const [invoiceState, setInvoiceState] = useState("pending");
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<unknown>(null);
  const [isSatDenomination, setSatDenomination] = useState(true);

  const invoiceCheckerIntervalRef = useRef<NodeJS.Timeout>();
  const invoiceCheckCounterRef = useRef(0);
  const nwc = useRef<webln.NostrWebLNProvider>();

  const fiatCurrency = getPreferenceValues<{ currency: string }>().currency;

  const checkInvoicePayment = (invoice: string) => {
    if (invoiceCheckerIntervalRef && invoiceCheckerIntervalRef.current) {
      clearInterval(invoiceCheckerIntervalRef.current);
    }
    invoiceCheckerIntervalRef.current = setInterval(async () => {
      if (!nwc.current || !nwc.current.lookupInvoice) {
        return;
      }
      await showToast(Toast.Style.Animated, "Waiting for payment...");
      // just in case. don't poll too long
      if (invoiceCheckCounterRef.current > 210) {
        clearInterval(invoiceCheckerIntervalRef.current);
        await showToast(Toast.Style.Success, "No longer checking for payments");
      }
      try {
        const response = await nwc.current.lookupInvoice({ paymentRequest: invoice });
        if (response.paid && response.preimage) {
          clearInterval(invoiceCheckerIntervalRef.current);
          setInvoiceState("paid");
          await showToast(Toast.Style.Success, "Invoice paid");
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
      await showToast(Toast.Style.Failure, "Please specify an amount for the invoice.");
      return;
    }

    try {
      setLoading(true);
      let satoshis: string | number = amount;
      nwc.current = await connectWallet();
      await showToast(Toast.Style.Animated, "Requesting invoice...");
      if (!isSatDenomination) {
        satoshis = await fiat.getSatoshiValue({ amount: amount, currency: fiatCurrency });
        console.log(satoshis);
      }
      const invoiceResponse = await nwc.current.makeInvoice({
        amount: satoshis, // This should be the amount in satoshis
        defaultMemo: description,
      });

      if (invoiceResponse && invoiceResponse.paymentRequest) {
        setInvoice(invoiceResponse.paymentRequest);
        setInvoiceMarkdown(await getQRCodeMarkdownContent(invoiceResponse.paymentRequest));
        checkInvoicePayment(invoiceResponse.paymentRequest);
        await showToast(Toast.Style.Success, "Invoice created");
      } else {
        await showToast(Toast.Style.Failure, "Failed to create invoice");
      }
    } catch (error) {
      setConnectionError(error);
      await showToast(Toast.Style.Failure, "Error creating invoice");
      console.trace(error);
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

              <Action
                title={`Swap Currency to ${isSatDenomination ? fiatCurrency : "Satoshi"}`}
                onAction={() => setSatDenomination(!isSatDenomination)}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel>
          }
        >
          <Form.TextField
            id="amount"
            title={`Amount (${isSatDenomination ? "Satoshis" : fiatCurrency})`}
            placeholder={`Enter the amount in ${isSatDenomination ? "satoshis" : fiatCurrency}`}
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
              <Detail.Metadata.Label
                title="Amount"
                text={`${amount} ${isSatDenomination ? "sats" : fiatCurrency}`}
                icon={Icon.Bolt}
              />
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
