import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { ResultView } from "./components/ResultView";
import { pushOptionalArg } from "./lib/arg-utils";
import { runZbdw } from "./lib/runner";

interface WithdrawValues {
  mode: "auto" | "create" | "status";
  amountOrId?: string;
}

export default function WithdrawCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<unknown>();

  async function onSubmit(values: WithdrawValues) {
    setIsLoading(true);
    setError(undefined);
    try {
      const args = ["withdraw"];
      if (values.mode === "create") {
        args.push("create");
      }
      if (values.mode === "status") {
        args.push("status");
      }
      pushOptionalArg(args, values.amountOrId);
      setResult(await runZbdw(args));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (result !== undefined) {
    return <ResultView title="zbdw withdraw" data={result} onBack={() => setResult(undefined)} />;
  }

  if (error !== undefined) {
    return <ErrorView title="zbdw withdraw" error={error} onBack={() => setError(undefined)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Zbdw Withdraw" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" defaultValue="auto">
        <Form.Dropdown.Item value="auto" title="auto (withdraw <arg>)" />
        <Form.Dropdown.Item value="create" title="create" />
        <Form.Dropdown.Item value="status" title="status" />
      </Form.Dropdown>
      <Form.TextField id="amountOrId" title="Amount or Withdraw ID" placeholder="Required for all modes" />
    </Form>
  );
}
