import { Action, ActionPanel, Clipboard, Form, Keyboard, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { isValidJson, transformJson } from "./minify";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function copyResult(result: string, successTitle: string): Promise<void> {
  try {
    await Clipboard.copy(result);
    await showToast({ style: Toast.Style.Success, title: successTitle });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't copy result",
      message: getErrorMessage(error),
    });
  }
}

function focusTextArea(textArea: Form.TextArea | null): void {
  textArea?.focus();
}

export default function Command() {
  const [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState<string>();
  const [pretty, setPretty] = useState(false);
  const [prefilledFromClipboard, setPrefilledFromClipboard] = useState(false);
  const [result, setResult] = useState("");
  const userEdited = useRef(false);
  const jsonTextArea = useRef<Form.TextArea | null>(null);

  const actionTitle = pretty ? "Pretty Print" : "Minify";

  useEffect(() => {
    let cancelled = false;

    Clipboard.readText()
      .then((text) => {
        if (!cancelled && !userEdited.current && text?.trim() && isValidJson(text)) {
          setJson(text);
          setPrefilledFromClipboard(true);
        }
      })
      .catch(() => {
        // Clipboard prefill is optional; leave the input empty if reading fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (values: { json: string }) => {
    let minified: string;

    try {
      minified = transformJson(values.json, pretty);
    } catch (error) {
      setJsonError(getErrorMessage(error));
      jsonTextArea.current?.focus();
      return;
    }

    setJsonError(undefined);
    setResult(minified);
    await copyResult(minified, `${pretty ? "Pretty-printed" : "Minified"} JSON copied to clipboard`);
  };

  const clearInput = () => {
    userEdited.current = true;
    setJson("");
    setJsonError(undefined);
    setPrefilledFromClipboard(false);
    setResult("");
    jsonTextArea.current?.focus();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={actionTitle} onSubmit={handleSubmit} />
          {result ? (
            <Action
              title="Copy Result"
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copyResult(result, "Copied to clipboard")}
            />
          ) : null}
          {json ? <Action title="Clear Input" onAction={clearInput} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="JSON"
        placeholder="Paste your JSON here"
        value={json}
        error={jsonError}
        info={prefilledFromClipboard ? "Prefilled from clipboard" : undefined}
        ref={jsonTextArea}
        onChange={(value) => {
          userEdited.current = true;
          setJson(value);
          setJsonError(undefined);
          setPrefilledFromClipboard(false);
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
        <Form.TextArea id="result" title="Result" value={result} onChange={() => {}} ref={focusTextArea} />
      ) : null}
    </Form>
  );
}
