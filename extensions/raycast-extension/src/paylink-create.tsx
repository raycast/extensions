import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { pushOption, pushOptionalArg } from "./lib/arg-utils";
import { runZbdw } from "./lib/runner";

interface PaylinkCreateValues {
  amountSats?: string;
  minSats?: string;
  maxSats?: string;
  multiUse?: boolean;
  maxUses?: string;
  title?: string;
  description?: string;
  orderId?: string;
  customerRef?: string;
  campaign?: string;
}

export default function PaylinkCreateCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: PaylinkCreateValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      const args = ["paylink", "create"];
      pushOptionalArg(args, values.amountSats);
      pushOption(args, "--min-sats", values.minSats);
      pushOption(args, "--max-sats", values.maxSats);
      if (values.multiUse) {
        args.push("--multi-use");
      }
      pushOption(args, "--max-uses", values.maxUses);
      pushOption(args, "--title", values.title);
      pushOption(args, "--description", values.description);
      pushOption(args, "--order-id", values.orderId);
      pushOption(args, "--customer-ref", values.customerRef);
      pushOption(args, "--campaign", values.campaign);
      setResult(await runZbdw(args));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="paylink create" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="paylink create" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Paylink" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="Optional fixed amount" />
      <Form.TextField id="minSats" title="Min sats" placeholder="Optional range min" />
      <Form.TextField id="maxSats" title="Max sats" placeholder="Optional range max" />
      <Form.Checkbox id="multiUse" label="Enable Multi-use" defaultValue={false} />
      <Form.TextField id="maxUses" title="Max uses" placeholder="Optional" />
      <Form.TextField id="title" title="Title" placeholder="Optional metadata" />
      <Form.TextField id="description" title="Description" placeholder="Optional metadata" />
      <Form.TextField id="orderId" title="Order ID" placeholder="Optional metadata" />
      <Form.TextField id="customerRef" title="Customer Ref" placeholder="Optional metadata" />
      <Form.TextField id="campaign" title="Campaign" placeholder="Optional metadata" />
    </Form>
  );
}
