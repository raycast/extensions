import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface OnchainQuoteValues {
  amountSats: string;
  destination: string;
}

export default function OnchainQuoteCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: OnchainQuoteValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      setResult(await runZbdw(["onchain", "quote", values.amountSats.trim(), values.destination.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="onchain quote" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="onchain quote" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Onchain Quote" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="Required" />
      <Form.TextField id="destination" title="Destination" placeholder="Bitcoin address required" />
    </Form>
  );
}
