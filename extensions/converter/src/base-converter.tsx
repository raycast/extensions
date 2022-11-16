import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { commonPreferences, isEmpty } from "./utils/common-utils";
import { baseToBase, buildBases } from "./utils/base-converter-utils";
import { BaseConvertersAdvanceView } from "./components/base-converters-advance-view";
import { BaseConvertersSimpleView } from "./components/base-converters-simple-view";
import { getInputItem } from "./hooks/get-input-item";

export default function BaseConverter() {
  const { autoDetect, priorityDetection, advanceView, advanceViewLocation } = commonPreferences();

  const [base10, setBase10] = useState<string>("0");
  const [base2, setBase2] = useState<string>("0");
  const [base4, setBase4] = useState<string>("0");
  const [base8, setBase8] = useState<string>("0");
  const [base16, setBase16] = useState<string>("0");
  const [base32, setBase32] = useState<string>("0");
  const [baseString, setBaseString] = useState<string>("0");
  const [baseRadix, setBaseRadix] = useState<number>(10);

  const [input, setInput] = useState<string>("0");
  const [output, setOutput] = useState<string>("0");
  const [fromBase, setFromBase] = useState<string>("10");
  const [toBase, setToBase] = useState<string>("2");
  const bases = buildBases();

  const inputItem = getInputItem(autoDetect, priorityDetection);
  useEffect(() => {
    async function _fetch() {
      setBaseString(inputItem);
      setBaseRadix(10);
    }

    _fetch().then();
  }, [inputItem]);

  useEffect(() => {
    async function _fetch() {
      const baseNumber = parseInt(baseString, baseRadix);
      if (isNaN(baseNumber) || isEmpty(baseString.trim())) return;
      setBase10(baseNumber.toString(10));
      setBase2(baseNumber.toString(2));
      setBase4(baseNumber.toString(4));
      setBase8(baseNumber.toString(8));
      setBase16(baseNumber.toString(16));
      setBase32(baseNumber.toString(32));
      setInput(baseNumber.toString(baseRadix));
    }

    _fetch().then();
  }, [baseString]);

  useEffect(() => {
    async function _fetch() {
      setOutput(baseToBase(input, fromBase, toBase));
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
                setBaseString("0");
                setBaseRadix(10);
              }}
            />
          </ActionPanel.Section>
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
