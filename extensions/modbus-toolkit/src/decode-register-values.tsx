import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  decodeRegisterValue,
  RegisterByteOrder,
  RegisterDataType,
  RegisterDecodeResult,
} from "./register-codec";

type FormValues = {
  bytes: string;
  dataType: RegisterDataType;
  byteOrder: RegisterByteOrder;
};

export default function Command() {
  const { push } = useNavigation();
  const [bytes, setBytes] = useState("41 20 00 00");

  async function submit(values: FormValues) {
    try {
      push(
        <DecodeResult
          result={decodeRegisterValue(
            values.bytes,
            values.dataType,
            values.byteOrder,
          )}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to Decode Registers",
        message:
          error instanceof Error ? error.message : "Check the register bytes",
      });
    }
  }

  async function pasteBytes() {
    const text = await Clipboard.readText();
    if (text?.trim()) setBytes(text.trim());
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Decode Register Values"
            icon={Icon.Code}
            onSubmit={submit}
          />
          <Action
            title="Paste Bytes from Clipboard"
            icon={Icon.Clipboard}
            onAction={pasteBytes}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="bytes"
        title="Register Bytes"
        placeholder="For example: 41 20 00 00"
        value={bytes}
        onChange={setBytes}
      />
      <Form.Dropdown id="dataType" title="Data Type" defaultValue="float32">
        <Form.Dropdown.Item value="uint16" title="UInt16" />
        <Form.Dropdown.Item value="int16" title="Int16" />
        <Form.Dropdown.Item value="uint32" title="UInt32" />
        <Form.Dropdown.Item value="int32" title="Int32" />
        <Form.Dropdown.Item value="float32" title="Float32" />
        <Form.Dropdown.Item value="float64" title="Float64" />
        <Form.Dropdown.Item value="ascii" title="ASCII Text" />
        <Form.Dropdown.Item value="hex" title="Hexadecimal" />
      </Form.Dropdown>
      <Form.Dropdown id="byteOrder" title="Byte Order" defaultValue="abcd">
        <Form.Dropdown.Item value="abcd" title="ABCD · Big Endian" />
        <Form.Dropdown.Item value="cdab" title="CDAB · Word Swap" />
        <Form.Dropdown.Item value="badc" title="BADC · Byte Swap" />
        <Form.Dropdown.Item value="dcba" title="DCBA · Little Endian" />
      </Form.Dropdown>
      <Form.Description
        title="Input"
        text="Enter complete 16-bit register bytes in the order received from the device."
      />
    </Form>
  );
}

function DecodeResult({ result }: { result: RegisterDecodeResult }) {
  const { pop } = useNavigation();
  const report = [
    `${result.typeLabel}: ${result.value}`,
    `Byte order: ${result.orderLabel}`,
    `Input bytes: ${result.rawBytes}`,
    `Ordered bytes: ${result.orderedBytes}`,
  ].join("\n");

  const actions = (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Decoded Value"
        content={result.value}
      />
      <Action.CopyToClipboard title="Copy Full Report" content={report} />
      <Action.Paste title="Paste Decoded Value" content={result.value} />
      <Action title="Back to Input" icon={Icon.ArrowLeft} onAction={pop} />
    </ActionPanel>
  );

  return (
    <List navigationTitle="Decoded Register Value">
      <List.Section title="Result">
        <List.Item
          title={result.value}
          subtitle={result.typeLabel}
          actions={actions}
        />
      </List.Section>
      <List.Section title="Interpretation">
        <List.Item
          title="Byte Order"
          accessories={[{ text: result.orderLabel }]}
          actions={actions}
        />
        <List.Item
          title="Input Bytes"
          accessories={[{ text: result.rawBytes }]}
          actions={actions}
        />
        <List.Item
          title="Ordered Bytes"
          accessories={[{ text: result.orderedBytes }]}
          actions={actions}
        />
      </List.Section>
    </List>
  );
}
