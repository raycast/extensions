import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getCliDebounceDelay } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedText,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type CodecOperation = "encode" | "decode";
type Encoding = "base64" | "url";

type FormValues = {
  encoding: Encoding;
  input: string;
};

type TextCodecCommandProps = {
  operation: CodecOperation;
  initialInput?: string;
  initialEncoding?: Encoding;
};

export function TextCodecCommand({
  operation,
  initialInput = "",
  initialEncoding = "base64",
}: TextCodecCommandProps) {
  const [currentOperation, setCurrentOperation] =
    useState<CodecOperation>(operation);
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();

      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return (
    <CodecForm
      initialInput={initialInput}
      initialEncoding={initialEncoding}
      operation={currentOperation}
      onOperationChange={setCurrentOperation}
    />
  );
}

async function getInitialInput(): Promise<string> {
  try {
    const selectedText = await getSelectedText();

    if (selectedText.trim()) {
      return selectedText;
    }
  } catch {
    // Selection is optional; clipboard is the fallback source.
  }

  return (await Clipboard.readText()) ?? "";
}

function CodecForm({
  initialInput,
  initialEncoding,
  operation,
  onOperationChange,
}: {
  initialInput: string;
  initialEncoding: Encoding;
  operation: CodecOperation;
  onOperationChange: (operation: CodecOperation) => void;
}) {
  const [values, setValues] = useState<FormValues>({
    encoding: initialEncoding,
    input: initialInput,
  });
  const [output, setOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const lastToastErrorRef = useRef("");
  const resultTitle = operation === "encode" ? "Encoded" : "Decoded";
  const resultText = getResultText(output, isProcessing);
  const canCopy = Boolean(output);

  useEffect(() => {
    async function hydrateInitialInput() {
      const input = await getInitialInput();

      if (!input) {
        return;
      }

      setValues((currentValues) => {
        if (currentValues.input) {
          return currentValues;
        }

        return {
          ...currentValues,
          input,
        };
      });
    }

    hydrateInitialInput();
  }, []);

  useEffect(() => {
    if (!values.input.trim()) {
      setOutput("");
      lastToastErrorRef.current = "";
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const timeout = setTimeout(async () => {
      try {
        const nextOutput = await runTextCodec(
          operation,
          values.encoding,
          values.input,
        );

        setOutput(nextOutput);
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toastErrorKey = `${operation}:${values.encoding}:${values.input}:${message}`;

        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: `Could not ${operation} ${getEncodingLabel(values.encoding)}`,
            message,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    }, getCliDebounceDelay());

    return () => {
      clearTimeout(timeout);
    };
  }, [operation, values.encoding, values.input]);

  async function copyResult() {
    if (!canCopy) {
      return;
    }

    await Clipboard.copy(output);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Result",
    });
  }

  async function copyAsEncoding(encoding: Encoding) {
    if (!values.input.trim()) {
      return;
    }

    try {
      const encoded = await runTextCodec("encode", encoding, values.input);

      await Clipboard.copy(encoded);
      await showToast({
        style: Toast.Style.Success,
        title: `Copied ${getEncodingLabel(encoding)} Encoding`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not copy ${getEncodingLabel(encoding)} encoding`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function swapDirection() {
    const nextOperation = operation === "encode" ? "decode" : "encode";

    onOperationChange(nextOperation);
    setValues((currentValues) => ({
      ...currentValues,
      input: output || currentValues.input,
    }));
    setOutput("");
    lastToastErrorRef.current = "";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title={`Copy ${resultTitle}`}
            onAction={copyResult}
          />
          <Action
            icon={Icon.Switch}
            title={`Switch to ${operation === "encode" ? "Decode" : "Encode"}`}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={swapDirection}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Input"
            content={values.input}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy as Base64 Encoding"
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            onAction={() => copyAsEncoding("base64")}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy as URL Encoding"
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={() => copyAsEncoding("url")}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="operation"
        title="Mode"
        value={operation}
        onChange={(nextOperation) =>
          onOperationChange(nextOperation as CodecOperation)
        }
      >
        <Form.Dropdown.Item title="Encode" value="encode" />
        <Form.Dropdown.Item title="Decode" value="decode" />
      </Form.Dropdown>
      <Form.Dropdown
        id="encoding"
        title="Encoding"
        value={values.encoding}
        onChange={(encoding) =>
          setValues((currentValues) => ({
            ...currentValues,
            encoding: encoding as Encoding,
          }))
        }
      >
        <Form.Dropdown.Item title="Base64" value="base64" />
        <Form.Dropdown.Item title="URL" value="url" />
      </Form.Dropdown>
      <Form.TextArea
        id="input"
        title="Input"
        placeholder={`Text to ${operation}`}
        value={values.input}
        onChange={(input) =>
          setValues((currentValues) => ({
            ...currentValues,
            input,
          }))
        }
      />

      <Form.Description title={resultTitle} text={resultText} />
    </Form>
  );
}

async function runTextCodec(
  operation: CodecOperation,
  encoding: Encoding,
  input: string,
): Promise<string> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    operation,
    "--quiet",
    encoding,
    input,
  ]);

  return stdout.trimEnd();
}

function getResultText(output: string, isProcessing: boolean): string {
  if (isProcessing) {
    return output ? `${output}...` : "...";
  }

  return output || " ";
}

function getEncodingLabel(encoding: Encoding): string {
  return encoding === "base64" ? "Base64" : "URL";
}
