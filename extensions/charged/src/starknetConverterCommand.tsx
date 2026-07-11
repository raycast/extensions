import { Form, ActionPanel, Action, Clipboard, closeMainWindow, showHUD, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import starknetConverter from "./utils/starknetConverter.js";
import { shortString } from "starknet";
import * as analytics from "./utils/analytics";

enum ELEMENTS {
  RAW_VALUE = "rawValueField",
  FELT_VALUE = "feltValueField",
  FELT_ARRAY_VALUE = "feltArrayValueField",
  HEX_VALUE = "hexValueField",
  STRING_VALUE = "stringValueField",
  SELECTOR_VALUE = "selectorValueField",
  U256_VALUE = "u256ValueField",
  BIG3_VALUE = "big3ValueField",
}

export default function Command() {
  const [rawValue, setRawValue] = useState<string>("");
  const [feltValue, setFeltValue] = useState<string | undefined>("");
  const [feltArrayValue, setFeltArrayValue] = useState<string | undefined>("[]");
  const [hexValue, setHexValue] = useState<string>("");
  const [stringValue, setStringValue] = useState<string>("");
  const [selectorValue, setSelectorValue] = useState<string>("");
  const [u256Value, setU256Value] = useState<string>("");
  const [big3Value, setBig3Value] = useState<string>("");
  const [focussedElement, setFocussedElement] = useState<ELEMENTS>(ELEMENTS.RAW_VALUE);

  useEffect(() => {
    analytics.trackEvent("OPEN_STARKNET_CONVERTER");
  }, []);

  const onRawValueChange = (value: string) => {
    setRawValue(value);

    setFeltValue(value ? starknetConverter.toBN(value)?.toString() : "");
    setFeltArrayValue(JSON.stringify(starknetConverter.toBNArray(value, 31)));

    const hex = starknetConverter.toHex(value);
    setHexValue(hex);

    const str = shortString.decodeShortString(hex);
    setStringValue(str);
    setSelectorValue(value ? starknetConverter.toSelector(str) : "");
    setU256Value(JSON.stringify(starknetConverter.to256(value), null, 4));
    setBig3Value(JSON.stringify(starknetConverter.toBig3(value), null, 4));
  };

  const onElementFocus = (element: ELEMENTS) => {
    setFocussedElement(element);
  };

  const onSubmit = async (values: any) => {
    analytics.trackEvent("CONVERTER_VALUE_COPIED");
    await Clipboard.copy(values[focussedElement]);
    await showHUD("Copied ✅");
    await closeMainWindow();
  };

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Copy to Clipboard" icon={Icon.CopyClipboard} onSubmit={onSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id={ELEMENTS.RAW_VALUE}
          title="Value"
          placeholder="hello, 0x68656c6c6f, 448378203247"
          onChange={onRawValueChange}
          value={rawValue}
          onFocus={() => onElementFocus(ELEMENTS.RAW_VALUE)}
        />
        <Form.TextField
          id={ELEMENTS.FELT_VALUE}
          title="Felt"
          placeholder=""
          onChange={() => {
            void 0;
          }}
          value={feltValue}
          onFocus={() => onElementFocus(ELEMENTS.FELT_VALUE)}
        />
        <Form.TextField
          id={ELEMENTS.FELT_ARRAY_VALUE}
          title="Felt*"
          placeholder=""
          onChange={() => {
            void 0;
          }}
          value={feltArrayValue}
          onFocus={() => onElementFocus(ELEMENTS.FELT_ARRAY_VALUE)}
        />
        <Form.TextField
          id={ELEMENTS.HEX_VALUE}
          title="Hex"
          placeholder=""
          onChange={() => {
            void 0;
          }}
          value={hexValue}
          onFocus={() => onElementFocus(ELEMENTS.HEX_VALUE)}
        />
        {!stringValue.includes("\n") ? (
          <Form.TextField
            id={`${ELEMENTS.STRING_VALUE}_text_field`}
            title="String"
            placeholder=""
            onChange={() => {
              void 0;
            }}
            value={stringValue}
            onFocus={() => onElementFocus(ELEMENTS.STRING_VALUE)}
          />
        ) : (
          <Form.TextArea
            id={`${ELEMENTS.STRING_VALUE}_text_area`}
            title="String"
            placeholder=""
            onChange={() => {
              void 0;
            }}
            value={stringValue}
            onFocus={() => onElementFocus(ELEMENTS.STRING_VALUE)}
          />
        )}
        <Form.TextField
          id={ELEMENTS.SELECTOR_VALUE}
          title="Selector"
          placeholder=""
          onChange={() => {
            void 0;
          }}
          value={selectorValue}
          onFocus={() => onElementFocus(ELEMENTS.SELECTOR_VALUE)}
        />
        <Form.TextArea
          id={ELEMENTS.U256_VALUE}
          title="U256"
          placeholder=""
          onChange={() => {
            void 0;
          }}
          value={u256Value}
          onFocus={() => onElementFocus(ELEMENTS.U256_VALUE)}
        />
        <Form.TextArea
          id={ELEMENTS.BIG3_VALUE}
          title="Big3"
          placeholder=""
          onChange={() => {
            void 0;
          }}
          value={big3Value}
          onFocus={() => onElementFocus(ELEMENTS.BIG3_VALUE)}
        />
      </Form>
    </>
  );
}
