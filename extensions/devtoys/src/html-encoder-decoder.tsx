import { Form, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { escape, unescape } from "html-escaper";

export default function HTMLEncoderDecoderCommand() {
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [mode, setMode] = useState<string>("encode");
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const updateMode = (mode: string) => {
    setIsPaused(true);
    setMode(mode);
    setInput(output);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!isPaused) {
      const isEncode = mode !== "decode";
      const output = isEncode ? escape(input) : unescape(input);

      setOutput(output);
    }
  }, [input]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" value={input} onChange={setInput} />

      <Form.TextArea id="output" title="Output" value={output} onChange={() => null} />

      <Form.Separator />

      <Form.Dropdown
        id="type"
        title="Convertion"
        info="Select which conversion mode you want to use."
        value={mode}
        onChange={updateMode}
      >
        <Form.Dropdown.Item value="encode" title="Encode" />
        <Form.Dropdown.Item value="decode" title="Decode" />
      </Form.Dropdown>
    </Form>
  );
}
