import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface InitValues {
  key?: string;
}

export default function InitCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: InitValues) {
    setIsLoading(true);
    setError(undefined);
    try {
      const args = ["init"];
      if (values.key?.trim()) {
        args.push("--key", values.key.trim());
      }
      const output = await runZbdw(args);
      setResult(output);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw init" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw init" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Init" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title="API Key Override" placeholder="Optional, otherwise preference key is used" />
    </Form>
  );
}
