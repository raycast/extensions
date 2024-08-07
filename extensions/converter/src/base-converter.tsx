import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { isEmpty } from "./utils/common-utils";
import { baseToBaseBigInt, buildBases, safeBigIntConverter } from "./utils/base-converter-utils";
import { BaseConvertersAdvanceView } from "./components/base-converters-advance-view";
import { BaseConvertersSimpleView } from "./components/base-converters-simple-view";
import { getInputItem } from "./hooks/get-input-item";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { advanceView, advanceViewLocation } from "./types/preferences";

export default function BaseConverter() {
  const [base10, setBase10] = useState<string>("");
  const [base2, setBase2] = useState<string>("");
  const [base4, setBase4] = useState<string>("");
  const [base8, setBase8] = useState<string>("");
  const [base16, setBase16] = useState<string>("");
  const [base32, setBase32] = useState<string>("");
  const [baseString, setBaseString] = useState<string>("");
  const [baseRadix, setBaseRadix] = useState<number>(10);

  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [fromBase, setFromBase] = useState<string>("10");
  const [toBase, setToBase] = useState<string>("2");
  const bases = buildBases();

  const inputItem = getInputItem();
  useEffect(() => {
    async function _fetch() {
      setBaseString(inputItem);
      setBaseRadix(10);
    }

    _fetch().then();
  }, [inputItem]);

  useEffect(() => {
    async function _fetch() {
      if (isEmpty(baseString.trim())) {
        setBase10("");
        setBase2("");
        setBase4("");
        setBase8("");
        setBase16("");
        setBase32("");
        setInput("");
      } else {
        const baseNumber = baseToBaseBigInt(baseString, baseRadix.toString(), "10");
        const baseStr = safeBigIntConverter(baseNumber);
        setBase10(baseNumber);
        setBase2(baseStr.toString(2));
        setBase4(baseStr.toString(4));
        setBase8(baseStr.toString(8));
        setBase16(baseStr.toString(16));
        setBase32(baseStr.toString(32));
        setInput(baseStr.toString(baseRadix));
      }
    }

    _fetch().then();
  }, [baseString]);

  useEffect(() => {
    async function _fetch() {
      setOutput(baseToBaseBigInt(input, fromBase, toBase));
      setBaseString(input);
      setBaseRadix(parseInt(fromBase));
    }

    _fetch().then();
  }, [input, fromBase, toBase]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Base 10"} content={base10} shortcut={{ modifiers: ["cmd"], key: "1" }} />
          <ActionPanel.Section>
            <Action.CopyToClipboard title={"Copy Base 2"} content={base2} shortcut={{ modifiers: ["cmd"], key: "2" }} />
            <Action.CopyToClipboard title={"Copy Base 4"} content={base4} shortcut={{ modifiers: ["cmd"], key: "3" }} />
            <Action.CopyToClipboard title={"Copy Base 8"} content={base8} shortcut={{ modifiers: ["cmd"], key: "4" }} />
            <Action.CopyToClipboard
              title={"Copy Base 16"}
              content={base16}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
            <Action.CopyToClipboard
              title={"Copy Base 32"}
              content={base32}
              shortcut={{ modifiers: ["cmd"], key: "6" }}
            />
            {advanceView && (
              <Action.CopyToClipboard
                title={"Copy Output"}
                content={output}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title={"Clear All"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
              onAction={() => {
                setBaseString("");
                setBaseRadix(10);
              }}
            />
          </ActionPanel.Section>
          <ActionOpenPreferences showCommandPreferences={true} showExtensionPreferences={true} />
        </ActionPanel>
      }
    >
      {advanceView && advanceViewLocation === "Top" && (
        <>
          <BaseConvertersAdvanceView
            bases={bases}
            output={output}
            inputUseState={[input, setInput]}
            fromBaseUseState={[fromBase, setFromBase]}
            toBaseUseState={[toBase, setToBase]}
          />
          <Form.Separator />
        </>
      )}
      <BaseConvertersSimpleView
        base10={base10}
        base2={base2}
        base4={base4}
        base8={base8}
        base16={base16}
        base32={base32}
        setBaseString={setBaseString}
        setBaseRadix={setBaseRadix}
      />
      {advanceView && advanceViewLocation === "Bottom" && (
        <>
          <Form.Separator />
          <BaseConvertersAdvanceView
            bases={bases}
            output={output}
            inputUseState={[input, setInput]}
            fromBaseUseState={[fromBase, setFromBase]}
            toBaseUseState={[toBase, setToBase]}
          />
        </>
      )}
    </Form>
  );
}
