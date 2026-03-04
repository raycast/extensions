import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";

type JsonMode = "pretty" | "minify" | "stringify" | "decode";

function transform(mode: JsonMode, input: string): string {
  switch (mode) {
    case "pretty":
      return JSON.stringify(JSON.parse(input), null, 2);
    case "minify":
      return JSON.stringify(JSON.parse(input));
    case "stringify":
      return JSON.stringify(input);
    case "decode": {
      const parsed = JSON.parse(input);
      if (typeof parsed !== "string") {
        throw new Error(
          'Decode mode expects a JSON string literal, such as "hello\\nworld"',
        );
      }
      return parsed;
    }
  }
}

export function ToolsJsonView() {
  const [mode, setMode] = useState<JsonMode>("pretty");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input.trim()) return { output: "", error: "" };
    try {
      return { output: transform(mode, input), error: "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: "", error: message };
    }
  }, [input, mode]);

  const outputLength = result.output.length;
  const outputPreview = useMemo(() => {
    if (!result.output) return "";
    const maxChars = 900;
    if (result.output.length <= maxChars) return result.output;
    return `${result.output.slice(0, maxChars)}\n\n... (${result.output.length - maxChars} more chars)`;
  }, [result.output]);

  async function pasteFromClipboard() {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }
    setInput(clipboardText);
  }

  async function handleCopy() {
    if (!result.output) {
      await showToast({
        style: Toast.Style.Failure,
        title: result.error || "No output to copy",
      });
      return;
    }
    await Clipboard.copy(result.output);
    await showToast({ style: Toast.Style.Success, title: "Output copied" });
  }

  return (
    <Form
      navigationTitle="Tools: JSON Stringify Decode"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Output">
            <Action
              title="Copy Output"
              icon={Icon.Clipboard}
              onAction={handleCopy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Input">
            <Action
              title="Paste from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={pasteFromClipboard}
            />
            <Action
              title="Use JSON Object Example"
              icon={Icon.Document}
              onAction={() =>
                setInput('{"env":"prod","region":"us-east-1","enabled":true}')
              }
            />
            <Action
              title="Use JSON String Example"
              icon={Icon.Text}
              onAction={() => setInput('"hello\\nraycast"')}
            />
            <Action
              title="Clear Input"
              icon={Icon.XmarkCircle}
              onAction={() => setInput("")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder='Input JSON or text. Example: {"a":1} or "line\\nvalue"'
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(value) => setMode(value as JsonMode)}
      >
        <Form.Dropdown.Item value="pretty" title="Pretty Print JSON" />
        <Form.Dropdown.Item value="minify" title="Minify JSON" />
        <Form.Dropdown.Item
          value="stringify"
          title="Stringify Text as JSON String"
        />
        <Form.Dropdown.Item value="decode" title="Decode JSON String Literal" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Status"
        text={result.error ? `Error: ${result.error}` : "Ready"}
      />
      <Form.Description
        title="Output Length"
        text={result.output ? `${outputLength} chars` : "-"}
      />
      <Form.Description
        title="Output Preview"
        text={outputPreview || "Output appears here"}
      />
    </Form>
  );
}

export default ToolsJsonView;
