import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { runZbdw } from "./lib/runner";

interface SendValues {
  destination: string;
  amountSats: string;
}

export default function SendCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: SendValues) {
    setIsLoading(true);
    setError(undefined);
    try {
      setResult(await runZbdw(["send", values.destination.trim(), values.amountSats.trim()]));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw send" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw send" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Send" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="destination" title="Destination" placeholder="bolt11, lnurl, @gamertag, or ln address" />
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="Required" />
    </Form>
  );
}
