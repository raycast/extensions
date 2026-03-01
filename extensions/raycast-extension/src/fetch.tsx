import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { pushOption } from "./lib/arg-utils";
import { runZbdw } from "./lib/runner";

interface FetchValues {
  url: string;
  method: string;
  data?: string;
  maxSats?: string;
}

export default function FetchCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: FetchValues) {
    setIsLoading(true);
    setError(undefined);
    try {
      const args = ["fetch", values.url.trim()];
      pushOption(args, "--method", values.method);
      pushOption(args, "--data", values.data);
      pushOption(args, "--max-sats", values.maxSats);
      setResult(await runZbdw(args));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw fetch" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw fetch" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Fetch" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Required" />
      <Form.TextField id="method" title="Method" defaultValue="GET" />
      <Form.TextArea id="data" title="JSON Body" placeholder="Optional raw JSON" />
      <Form.TextField id="maxSats" title="Max sats" placeholder="Optional" />
    </Form>
  );
}
