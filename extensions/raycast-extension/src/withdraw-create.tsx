import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface WithdrawCreateValues {
  amountSats: string;
}

export default function WithdrawCreateCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: WithdrawCreateValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      setResult(await runZbdw(["withdraw", "create", values.amountSats.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="withdraw create" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="withdraw create" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Withdrawal" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="Required" />
    </Form>
  );
}
