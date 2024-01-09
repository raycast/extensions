import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { PythonShell } from "python-shell";

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

  const onSubmit = async (values: { code: string }) => {
    setError(undefined);
    // TODO make configurable
    const options = {
      pythonPath: "python3",
      encoding: "utf8" as BufferEncoding,
    };
    try {
      const messages = await PythonShell.runString(values.code, options);
      setResult(messages.join("\n"));
    } catch (e) {
      setError(e as Error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel title="Python interpreter">
          <Action.SubmitForm title="Run" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="code" title="Code" placeholder="print('Hello, World!')" />
      {result && <Form.TextArea id="result" title="Result" defaultValue={result} />}
    </Form>
  );
}
