import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface PaylinkGetValues {
  id: string;
}

export default function PaylinkGetCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: PaylinkGetValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      setResult(await runZbdw(["paylink", "get", values.id.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="paylink get" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="paylink get" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Paylink" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="Paylink ID" placeholder="Required" />
    </Form>
  );
}
