import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { PythonShell, PythonShellError } from "python-shell";

const code = (dict: string) =>
  `
# -*- coding: utf-8 -*-
d = ${dict}
if not isinstance(d, dict):
    raise Exception('Not a valid dict')
import sys, json
json.dump(d, sys.stdout, indent=2, ensure_ascii=False)
`;

const formatError = (e: PythonShellError & { script: string }) =>
  (e as Error).message.replace(`File "${(e as PythonShellError & { script: string }).script}", `, "").trim();

export default function Command() {
  const [error, setError] = useState<Error>();
  const [result, setResult] = useState<string>();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const onSubmit = async (values: { dict: string }) => {
    setError(undefined);
    // TODO make configurable
    const options = {
      pythonPath: "python3",
      encoding: "utf8" as BufferEncoding,
    };
    try {
      const messages = await PythonShell.runString(code(values.dict), options);
      setResult(messages.join("\n"));
    } catch (e) {
      setError(new Error(formatError(e as PythonShellError & { script: string })));
    }
  };

  return (
    <Form
      actions={
        <ActionPanel title="Python interpreter">
          <Action.SubmitForm title="Run" onSubmit={onSubmit} />
          <Action.CopyToClipboard title="Copy Result to Clipboard" content={result || ""} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="dict" title="Dict" placeholder="{'a': [1, 2, 3]}" />
      {result && <Form.TextArea id="json" title="JSON" defaultValue={result} />}
    </Form>
  );
}
