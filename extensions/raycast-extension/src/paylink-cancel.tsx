import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface PaylinkCancelValues {
  id: string;
}

export default function PaylinkCancelCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: PaylinkCancelValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      setResult(await runZbdw(["paylink", "cancel", values.id.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="paylink cancel" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="paylink cancel" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Cancel Paylink" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="Paylink ID" placeholder="Required" />
    </Form>
  );
}
