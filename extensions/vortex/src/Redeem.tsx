import "cross-fetch/polyfill";
import { Action, ActionPanel, Clipboard, Form, getSelectedText, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getDecodedToken, Token } from "@cashu/cashu-ts";
import CashuRedeem from "./components/CashuRedeem";
import LnurlRedeem from "./components/LnurlRedeem";
import { requestMeltQuote } from "./utils/cashuRedeemUtils";
import { CashuData, ParsedLNURLData } from "./types";
import { bech32 } from "bech32";
import { URL_REGEX } from "./constants";
import Style = Toast.Style;

export default function Redeem(props: LaunchProps<{ arguments: Arguments.Redeem }>) {
  const [input, setInput] = useState(props.arguments.input);
  const [error, setError] = useState("");
  const [cashuData, setCashuData] = useState<CashuData>();
  const [lnurlData, setLnurlData] = useState<ParsedLNURLData>();

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
    try {
      try {
        text = await getSelectedText();
      } catch (e) {
        // ignore error for getting selected text
      }
      if (!text) {
        text = await Clipboard.readText();
      }
    } catch (e) {
      console.error(e);
    }

    if (
      text &&
      (text.toLowerCase().startsWith("lnurl") || text.startsWith("cashu") || text.startsWith("web+cashu://"))
    ) {
      setInput(text);
      await showToast(Toast.Style.Success, "Copied data from clipboard");
    }
  };

  const handleInput = async () => {
    if (!input) {
      return;
    }

    if (input.toLowerCase().startsWith("lnurl1")) {
      try {
        const { words } = bech32.decode(input.toLowerCase(), 2000);
        const requestByteArray = bech32.fromWords(words);
        const url = Buffer.from(requestByteArray).toString();
        await showToast(Toast.Style.Animated, "Fetching Data from LNURL");
        !URL_REGEX.test(url) &&
          (() => {
            throw new Error("Invalid URL");
          })();
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          await showToast(Style.Failure, `Network response failed`);
        }

        const data = await response.json();

        if (!isValidLNURLWithdraw(data)) {
          await showToast(Style.Failure, "Invalid LNURL withdraw format");
          return;
        }

        if (data.minWithdrawable > data.maxWithdrawable) {
          await showToast(Style.Failure, "Invalid withdrawal amount range");
          return;
        }

        await showToast(Toast.Style.Success, "Copied data from LNURL");
        setLnurlData(data);
      } catch (e) {
        setError("Invalid LNurl");
      }
      return;
    }

    if (input.startsWith("cashu") || input.startsWith("web+cashu://")) {
      let token: Token;
      try {
        token = getDecodedToken(input);
        if (!token.unit) {
          setError("Invalid token");
        }

        const meltQuoteResponse = await requestMeltQuote(token);

        if (meltQuoteResponse) {
          const { meltQuote, unitPrice } = meltQuoteResponse;
          setCashuData({
            data: token,
            amount: Math.floor((meltQuote.amount - meltQuote.fee_reserve) * unitPrice),
            fee: Math.floor(meltQuote.fee_reserve * unitPrice),
          });
        }

        return;
      } catch (e) {
        console.debug(e);
        return;
      }
    }
    setError("Not Redeemable");
    return;
  };

  return (
    <>
      {!cashuData && !lnurlData && (
        <Form
          actions={
            <ActionPanel>
              <Action title={`Receive Your Sats!`} onAction={handleInput} />
            </ActionPanel>
          }
        >
          <Form.TextField
            id="input"
            title="Withdraw Satoshis"
            placeholder="Cashu Token or LNURL withdraw"
            value={input}
            error={error}
            onChange={setInput}
          />
        </Form>
      )}
      {cashuData && <CashuRedeem redeemData={cashuData} />}
      {lnurlData && <LnurlRedeem redeemData={lnurlData} />}
    </>
  );
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isValidLNURLWithdraw = (data: any): data is ParsedLNURLData => {
  return (
    data &&
    typeof data.callback === "string" &&
    typeof data.k1 === "string" &&
    typeof data.maxWithdrawable === "number" &&
    typeof data.minWithdrawable === "number" &&
    data.tag === "withdrawRequest"
  );
};
