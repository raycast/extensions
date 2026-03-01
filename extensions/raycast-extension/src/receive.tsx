import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { pushOptionalArg } from "./lib/arg-utils";
import { runZbdw } from "./lib/runner";

interface ReceiveValues {
  amountSats?: string;
  description?: string;
  isStatic?: boolean;
}

export default function ReceiveCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: ReceiveValues) {
    setIsLoading(true);
    setError(undefined);
    try {
      const args = ["receive"];
      pushOptionalArg(args, values.amountSats);
      pushOptionalArg(args, values.description);
      if (values.isStatic) {
        args.push("--static");
      }
      setResult(await runZbdw(args));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw receive" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw receive" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Receive" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="Optional" />
      <Form.TextField id="description" title="Description" placeholder="Optional" />
      <Form.Checkbox id="isStatic" label="Use --static" defaultValue={false} />
    </Form>
  );
}
