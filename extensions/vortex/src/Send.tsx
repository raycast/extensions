import "cross-fetch/polyfill";
import { useState, useEffect } from "react";

import { Form, ActionPanel, Action, Clipboard, getSelectedText, LaunchProps } from "@raycast/api";
import { LightningAddress, Invoice } from "@getalby/lightning-tools";

import ConnectionError from "./ConnectionError";
import PayInvoice from "./PayInvoice";
import PayToLightingAddress from "./PayLightningAddress";
import { connectWallet } from "./wallet";

const LN_ADDRESS_REGEX =
  /^((?:[^<>()[\]\\.,;:\s@"]+(?:\.[^<>()[\]\\.,;:\s@"]+)*)|(?:".+"))@((?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function Send(props: LaunchProps<{ arguments: Arguments.Send }>) {
  const [lightningAddress, setLightningAddress] = useState("");
  const [invoice, setInvoice] = useState("");
  const [input, setInput] = useState(props.arguments.input);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState<unknown>(null);

  useEffect(() => {
    tryConnectWallet();
    discoverInput();
  }, []);

  useEffect(() => {
    handleInput();
  }, [input]);

  const tryConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      setConnectionError(error);
    }
  };

  const discoverInput = async () => {
    if (input) {
      return;
    }
    let text;
    // if we don't have an input we try to discover it from the selection or clipboard
    if (!text) {
      // try try and catch all the errors
      try {
        try {
          text = await getSelectedText();
        } catch (e) {
          // ignore error for getting selected text
        }
        // if nothing was selected we check the clipboard
        if (!text) {
          text = await Clipboard.readText();
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (text && (text.toLowerCase().startsWith("lnbc1") || text.match(LN_ADDRESS_REGEX))) {
      setInput(text);
    }
  };

  const handleInput = async () => {
    if (!input) {
      return;
    }
    if (input?.toLowerCase().startsWith("lnbc1")) {
      const invoice = new Invoice({ pr: input });
      setInvoice(invoice.paymentRequest);
      return;
    }
    if (input?.match(LN_ADDRESS_REGEX)) {
      const lnAddress = new LightningAddress(input);
      await lnAddress.fetch();
      if (lnAddress.lnurlpData?.callback) {
        setLightningAddress(input.toLowerCase());
        return;
      } else {
        setError("Not a Lightning Address");
      }
    }
  };

  if (connectionError) {
    return <ConnectionError error={connectionError} />;
  }

  return (
    <>
      {lightningAddress && <PayToLightingAddress lightningAddress={lightningAddress} />}
      {invoice && <PayInvoice invoice={invoice} />}

      {!lightningAddress && !invoice && (
        <Form
          actions={
            <ActionPanel>
              <Action title={`Send Payment`} onAction={handleInput} />
            </ActionPanel>
          }
        >
          <Form.TextField
            id="input"
            title="Recipient"
            placeholder="Invoice or Lightning Address"
            value={input}
            error={error}
            onChange={setInput}
          />
        </Form>
      )}
    </>
  );
}
