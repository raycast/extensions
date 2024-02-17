import "cross-fetch/polyfill";
import { useState, useEffect } from "react";

import { Form, ActionPanel, Action, Clipboard, getSelectedText, LaunchProps } from "@raycast/api";
import { LightningAddress, Invoice } from "@getalby/lightning-tools";

import PayInvoice from "./PayInvoice";
import PayToLightingAddress from "./PayLightningAddress";

export default function Send(props: LaunchProps<{ arguments: Arguments.Send }>) {
  const [lightningAddress] = useState("");
  const [invoice, setInvoice] = useState("");
  const [input, setInput] = useState(props.arguments.input);
  const [error, setError] = useState("");

  useEffect(() => {
    discoverInput();
  }, []);

  useEffect(() => {
    handleInput();
  }, [input]);

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
    if (text && (text.toLowerCase().startsWith("lnbc1") || text.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/))) {
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
    if (input?.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      const lnAddress = new LightningAddress(input);
      await lnAddress.fetch();
      if (lnAddress.lnurlpData?.callback) {
        setLightningAddress(input);
        return;
      } else {
        setError("Not a Lightning Address");
      }
    }
  };

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
