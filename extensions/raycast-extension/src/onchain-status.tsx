import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface OnchainStatusValues {
  payoutId: string;
}

export default function OnchainStatusCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: OnchainStatusValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      setResult(await runZbdw(["onchain", "status", values.payoutId.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="onchain status" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="onchain status" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Onchain Status" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="payoutId" title="Payout ID" placeholder="Required" />
    </Form>
  );
}
