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
  ChecksumAlgorithm,
  ChecksumOperation,
  ChecksumResult,
  processModbusChecksum,
} from "./modbus-checksum";

type FormValues = {
  algorithm: ChecksumAlgorithm;
  operation: ChecksumOperation;
  frame: string;
};

export default function Command() {
  const { push } = useNavigation();
  const [algorithm, setAlgorithm] = useState<ChecksumAlgorithm>("crc");
  const [operation, setOperation] = useState<ChecksumOperation>("calculate");
  const [frame, setFrame] = useState("10 06 02 02 00 03");

  async function submit(values: FormValues) {
    try {
      push(
        <ChecksumResultList
          result={processModbusChecksum(
            values.frame,
            values.algorithm,
            values.operation,
          )}
          operation={values.operation}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to Process Checksum",
        message:
          error instanceof Error ? error.message : "Check the input bytes",
      });
    }
  }

  async function pasteFrame() {
    const text = await Clipboard.readText();
    if (text?.trim()) setFrame(text.trim());
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              operation === "calculate"
                ? "Calculate Checksum"
                : "Verify Checksum"
            }
            icon={Icon.Calculator}
            onSubmit={submit}
          />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            onAction={pasteFrame}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="algorithm"
        title="Algorithm"
        value={algorithm}
        onChange={(value) => setAlgorithm(value as ChecksumAlgorithm)}
      >
        <Form.Dropdown.Item value="crc" title="Modbus RTU CRC16" />
        <Form.Dropdown.Item value="lrc" title="Modbus ASCII LRC" />
      </Form.Dropdown>
      <Form.Dropdown
        id="operation"
        title="Operation"
        value={operation}
        onChange={(value) => setOperation(value as ChecksumOperation)}
      >
        <Form.Dropdown.Item value="calculate" title="Calculate and Append" />
        <Form.Dropdown.Item value="verify" title="Verify Existing Checksum" />
      </Form.Dropdown>
      <Form.TextArea
        id="frame"
        title={
          operation === "calculate" ? "Data Without Checksum" : "Complete Frame"
        }
        placeholder={
          algorithm === "crc"
            ? "For example: 10 06 02 02 00 03"
            : "For example: :010302580002"
        }
        value={frame}
        onChange={setFrame}
      />
      <Form.Description
        title="Byte Order"
        text={
          algorithm === "crc"
            ? "The generated CRC is appended low byte first, as required by Modbus RTU."
            : "The LRC is appended as two hexadecimal ASCII characters before CRLF."
        }
      />
    </Form>
  );
}

function ChecksumResultList({
  result,
  operation,
}: {
  result: ChecksumResult;
  operation: ChecksumOperation;
}) {
  const { pop } = useNavigation();
  const report = [
    `${result.algorithmLabel}: ${result.checksum}`,
    `Wire bytes: ${result.wireBytes}`,
    ...(result.received ? [`Received: ${result.received}`] : []),
    ...(result.valid === undefined
      ? []
      : [`Valid: ${result.valid ? "Yes" : "No"}`]),
    `Complete frame: ${result.completeFrame}`,
  ].join("\n");
  const actions = (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Complete Frame"
        content={result.completeFrame}
      />
      <Action.CopyToClipboard
        title="Copy Checksum"
        content={result.wireBytes}
      />
      <Action.CopyToClipboard title="Copy Full Report" content={report} />
      <Action title="Back to Input" icon={Icon.ArrowLeft} onAction={pop} />
    </ActionPanel>
  );

  return (
    <List navigationTitle="Modbus Checksum Result">
      {operation === "verify" ? (
        <List.Section title="Verification">
          <List.Item
            title={result.valid ? "Checksum Is Valid" : "Checksum Is Invalid"}
            icon={result.valid ? Icon.CheckCircle : Icon.XMarkCircle}
            accessories={[{ text: result.valid ? "VALID" : "INVALID" }]}
            actions={actions}
          />
        </List.Section>
      ) : null}
      <List.Section title={result.algorithmLabel}>
        <List.Item
          title="Checksum"
          subtitle={result.checksum}
          accessories={[{ text: result.wireBytes }]}
          actions={actions}
        />
        {result.received ? (
          <List.Item
            title="Received Checksum"
            accessories={[{ text: result.received }]}
            actions={actions}
          />
        ) : null}
        <List.Item
          title="Complete Frame"
          subtitle={result.completeFrame}
          actions={actions}
        />
      </List.Section>
    </List>
  );
}
