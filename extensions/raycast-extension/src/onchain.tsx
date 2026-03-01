import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { pushOption, pushOptionalArg } from "./lib/arg-utils";
import { runZbdw } from "./lib/runner";

interface OnchainValues {
  mode: "quote" | "send" | "status" | "retry-claim";
  amountSats?: string;
  destination?: string;
  payoutId?: string;
  acceptTerms?: boolean;
}

export default function OnchainCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: OnchainValues) {
    setIsLoading(true);
    setError(undefined);
    try {
      const args = ["onchain", values.mode];
      if (values.mode === "quote" || values.mode === "send") {
        pushOptionalArg(args, values.amountSats);
        pushOptionalArg(args, values.destination);
      }

      if (values.mode === "send") {
        pushOption(args, "--payout-id", values.payoutId);
        if (values.acceptTerms) {
          args.push("--accept-terms");
        }
      }

      if (values.mode === "status" || values.mode === "retry-claim") {
        pushOptionalArg(args, values.payoutId);
      }

      setResult(await runZbdw(args));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw onchain" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw onchain" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Onchain" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" defaultValue="quote">
        <Form.Dropdown.Item value="quote" title="quote" />
        <Form.Dropdown.Item value="send" title="send" />
        <Form.Dropdown.Item value="status" title="status" />
        <Form.Dropdown.Item value="retry-claim" title="retry-claim" />
      </Form.Dropdown>
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="quote/send" />
      <Form.TextField id="destination" title="Destination" placeholder="quote/send" />
      <Form.TextField
        id="payoutId"
        title="Payout ID"
        placeholder="status/retry-claim or optional --payout-id for send"
      />
      <Form.Checkbox id="acceptTerms" label="--accept-terms (required for send)" defaultValue={false} />
    </Form>
  );
}
