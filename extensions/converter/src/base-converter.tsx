import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { commonPreferences, isEmpty } from "./utils/common-utils";
import { baseToBase, buildBases } from "./utils/base-converter-utils";

export default function CreateShortcut() {
  const { advanceView } = commonPreferences();
  const [base10, setBase10] = useState<string>("0");
  const [base2, setBase2] = useState<string>("0");
  const [base4, setBase4] = useState<string>("0");
  const [base8, setBase8] = useState<string>("0");
  const [base16, setBase16] = useState<string>("0");
  const [base32, setBase32] = useState<string>("0");

  const [input, setInput] = useState<string>("0");
  const [output, setOutput] = useState<string>("0");
  const [fromBase, setFromBase] = useState<string>("10");
  const [toBase, setToBase] = useState<string>("2");
  const bases = buildBases();

  useEffect(() => {
    async function _fetch() {
      setBase2(Number(base10).toString(2));
      setBase4(Number(base10).toString(4));
      setBase8(Number(base10).toString(8));
      setBase16(Number(base10).toString(16));
      setBase32(Number(base10).toString(32));
    }

    _fetch().then();
  }, [base10]);

  useEffect(() => {
    async function _fetch() {
      setOutput(baseToBase(input, fromBase, toBase));
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
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => {
                setBase10("0");
                setInput("0");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"base10"}
        title="10"
        value={base10}
        onChange={(newValue) => {
          setBase10(Number(newValue).toString());
        }}
      />
      <Form.TextField
        id={"base2"}
        title="2"
        value={base2}
        onChange={(newValue) => {
          isEmpty(newValue.trim()) ? setBase10("0") : setBase10(parseInt(newValue.trim(), 2).toString());
        }}
      />
      <Form.TextField
        id={"base4"}
        title="4"
        value={base4}
        onChange={(newValue) => {
          isEmpty(newValue.trim()) ? setBase10("0") : setBase10(parseInt(newValue.trim(), 4).toString());
        }}
      />
      <Form.TextField
        id={"base8"}
        title="8"
        value={base8}
        onChange={(newValue) => {
          isEmpty(newValue.trim()) ? setBase10("0") : setBase10(parseInt(newValue.trim(), 8).toString());
        }}
      />
      <Form.TextField
        id={"base16"}
        title="16"
        value={base16}
        onChange={(newValue) => {
          isEmpty(newValue.trim()) ? setBase10("0") : setBase10(parseInt(newValue.trim(), 16).toString());
        }}
      />
      <Form.TextField
        id={"base32"}
        title="32"
        value={base32}
        onChange={(newValue) => {
          isEmpty(newValue.trim()) ? setBase10("0") : setBase10(parseInt(newValue.trim(), 32).toString());
        }}
      />
      {advanceView && (
        <>
          <Form.Separator />
          <Form.Dropdown id={"fromBase"} title={"From Base"} value={fromBase} onChange={setFromBase}>
            {bases.map((value) => {
              return <Form.DropdownItem key={"fromBase" + value.value} value={value.value} title={value.title} />;
            })}
          </Form.Dropdown>
          <Form.Dropdown id={"toBase"} title={"To Base"} value={toBase} onChange={setToBase}>
            {bases.map((value) => {
              return <Form.DropdownItem key={"toBase" + value.value} value={value.value} title={value.title} />;
            })}
          </Form.Dropdown>
          <Form.TextField
            id={"input"}
            title="Input"
            value={input}
            onChange={(newValue) => {
              if (isEmpty(newValue)) return;
              setInput(Number(newValue).toString());
            }}
          />
          <Form.Description title="Output" text={output} />
        </>
      )}
    </Form>
  );
}
