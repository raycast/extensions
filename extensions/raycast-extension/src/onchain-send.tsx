import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { pushOption } from "./lib/arg-utils";
import { runZbdw } from "./lib/runner";

interface OnchainSendValues {
  amountSats: string;
  destination: string;
  payoutId?: string;
  acceptTerms?: boolean;
}

export default function OnchainSendCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: OnchainSendValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      const args = ["onchain", "send", values.amountSats.trim(), values.destination.trim()];
      pushOption(args, "--payout-id", values.payoutId);
      if (values.acceptTerms) {
        args.push("--accept-terms");
      }
      setResult(await runZbdw(args));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="onchain send" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="onchain send" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Onchain Payout" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="Required" />
      <Form.TextField id="destination" title="Destination" placeholder="Bitcoin address required" />
      <Form.TextField id="payoutId" title="Payout ID" placeholder="Optional custom payout id" />
      <Form.Checkbox id="acceptTerms" label="Accept terms (required)" defaultValue={true} />
    </Form>
  );
}
