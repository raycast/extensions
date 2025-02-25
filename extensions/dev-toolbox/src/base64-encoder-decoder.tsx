import { ActionPanel, Form, Action, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Base64Converter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  useEffect(() => {
    try {
      if (!input) {
        setOutput("");
        return;
      }

      const result = mode === "encode" ? btoa(input) : atob(input);
      setOutput(result);
    } catch (error) {
      setOutput("");
    }
  }, [input, mode]);

  const handleCopy = () => {
    if (output) {
      Clipboard.copy(output);
      showToast({ style: Toast.Style.Success, title: `${mode === "encode" ? "Encoded" : "Decoded"} text copied!` });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Copy Result" onAction={handleCopy} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" value={mode} onChange={(val) => setMode(val as "encode" | "decode")}>
        <Form.Dropdown.Item value="encode" title="Encode" />
        <Form.Dropdown.Item value="decode" title="Decode" />
      </Form.Dropdown>
      <Form.TextArea
        id="input"
        title={mode === "encode" ? "Text to Encode" : "Base64 to Decode"}
        value={input}
        onChange={setInput}
      />
      <Form.Description text={`${mode === "encode" ? "Encoded Result" : "Decoded Result"}: ${output}`} />
    </Form>
  );
}
