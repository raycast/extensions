import { Action, ActionPanel, Clipboard, Form, Keyboard, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { transformJson } from "./minify";

export default function Command() {
  const [json, setJson] = useState("");
  const [pretty, setPretty] = useState(false);
  const [result, setResult] = useState("");
  const userEdited = useRef(false);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (userEdited.current || !text?.trim()) {
        return;
      }
      try {
        JSON.parse(text);
        setJson(text);
      } catch {
        return;
      }
    });
  }, []);

  const handleSubmit = async (values: { json: string }) => {
    try {
      const minified = transformJson(values.json, pretty);
      setResult(minified);
      await Clipboard.copy(minified);
      await showToast({
        style: Toast.Style.Success,
        title: "Minified JSON copied to clipboard",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Minify" onSubmit={handleSubmit} />
          <Action
            title="Copy Result"
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={async () => {
              if (!result) {
                return;
              }
              await Clipboard.copy(result);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied to clipboard",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="JSON"
        placeholder="Paste your JSON here"
        value={json}
        onChange={(value) => {
          setJson(value);
          setResult("");
        }}
      />
      <Form.Checkbox
        id="pretty"
        label="Pretty print"
        value={pretty}
        onChange={(value) => {
          setPretty(value);
          setResult("");
        }}
      />
      {result ? (
        <Form.TextArea
          id="result"
          title="Result"
          value={result}
          onChange={() => {}}
          ref={(el) => {
            if (el) {
              el.focus();
            }
          }}
        />
      ) : null}
    </Form>
  );
}
