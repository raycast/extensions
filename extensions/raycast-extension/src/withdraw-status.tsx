import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface WithdrawStatusValues {
  withdrawId: string;
}

export default function WithdrawStatusCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: WithdrawStatusValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      setResult(await runZbdw(["withdraw", "status", values.withdrawId.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="withdraw status" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="withdraw status" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Withdrawal Status" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="withdrawId" title="Withdraw ID" placeholder="Required" />
    </Form>
  );
}
