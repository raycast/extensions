import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface PaymentValues {
  id: string;
}

export default function PaymentCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: PaymentValues) {
    setIsLoading(true);
    setError(undefined);
    try {
      setResult(await runZbdw(["payment", values.id.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw payment" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw payment" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Payment" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="Payment ID" placeholder="Required" />
    </Form>
  );
}
