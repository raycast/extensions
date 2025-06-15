import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";

function encodeBase64(str: string): string {
  try {
    return Buffer.from(str).toString("base64");
  } catch (e) {
    return "";
  }
}

function decodeBase64(str: string): string {
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch (e) {
    return "";
  }
}

export default function Command() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState("encode");
  const [error, setError] = useState("");

  function handleConvert() {
    try {
      const result = mode === "encode" ? encodeBase64(input) : decodeBase64(input);
      setOutput(result);
      setError("");
      showToast({ style: Toast.Style.Success, title: "Success!" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setOutput("");
      setError(errorMessage);
      showToast({ style: Toast.Style.Failure, title: "Error", message: errorMessage });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title={mode === "encode" ? "Encode" : "Decode"} onAction={handleConvert} />
          {output && <Action.CopyToClipboard title="Copy Output" content={output} />}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Enter text or Base64 here"
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown id="mode" title="Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="encode" title="Encode" />
        <Form.Dropdown.Item value="decode" title="Decode" />
      </Form.Dropdown>
      <Form.TextArea
        id="output"
        title="Output"
        value={output}
        onChange={() => {}}
        placeholder="Output will appear here"
        enableMarkdown={false}
        autoFocus={false}
      />
      {error && <Form.Description title="Error" text={error} />}
    </Form>
  );
}
