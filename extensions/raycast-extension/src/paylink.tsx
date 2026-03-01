import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { pushOption, pushOptionalArg } from "./lib/arg-utils";
import { runZbdw } from "./lib/runner";

interface PaylinkValues {
  mode: "create" | "get" | "list" | "cancel";
  id?: string;
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

export default function PaylinkCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: PaylinkValues) {
    setIsLoading(true);
    setError(undefined);

    try {
      const args = ["paylink", values.mode];
      if (values.mode === "create") {
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
      }

      if (values.mode === "get" || values.mode === "cancel") {
        pushOptionalArg(args, values.id);
      }

      setResult(await runZbdw(args));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw paylink" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw paylink" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Paylink" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" defaultValue="list">
        <Form.Dropdown.Item value="create" title="create" />
        <Form.Dropdown.Item value="get" title="get" />
        <Form.Dropdown.Item value="list" title="list" />
        <Form.Dropdown.Item value="cancel" title="cancel" />
      </Form.Dropdown>
      <Form.TextField id="id" title="Paylink ID" placeholder="Used by get/cancel" />
      <Form.TextField id="amountSats" title="Amount (sats)" placeholder="create only" />
      <Form.TextField id="minSats" title="Min sats" placeholder="create only" />
      <Form.TextField id="maxSats" title="Max sats" placeholder="create only" />
      <Form.Checkbox id="multiUse" label="--multi-use" defaultValue={false} />
      <Form.TextField id="maxUses" title="Max uses" placeholder="create only" />
      <Form.TextField id="title" title="Title" placeholder="metadata" />
      <Form.TextField id="description" title="Description" placeholder="metadata" />
      <Form.TextField id="orderId" title="Order ID" placeholder="metadata" />
      <Form.TextField id="customerRef" title="Customer ref" placeholder="metadata" />
      <Form.TextField id="campaign" title="Campaign" placeholder="metadata" />
    </Form>
  );
}
