import { Action, ActionPanel, Detail, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { FuelAgent } from "fuel-agent-kit";
import nodeFetch from "node-fetch";
import { useState } from "react";

// Polyfill fetch
if (!global.fetch) {
  (global as unknown as NodeJS.Global).fetch = nodeFetch;
}

export default function Command() {
  const [loading, setLoading] = useState<boolean>(false);
  const [transactionLink, setTransactionLink] = useState<string | null>(null);
  const preferences = getPreferenceValues();

  const agent = new FuelAgent({
    openAiApiKey: preferences.openaiApiKey,
    walletPrivateKey: preferences.fuelWalletPrivateKey,
    model: "gpt-4o",
  });

  const executeCommandForm = (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Execute Command"
            onSubmit={async (values) => {
              setLoading(true);
              const toast = await showToast(Toast.Style.Animated, "Executing Command...");
              try {
                const response = await agent.execute(values.command);
                console.log("Command response:", response);

                // Extract the transaction link from the response
                const link = response.output.match(/https?:\/\/[^\s]+/)[0];
                setTransactionLink(link);

                toast.style = Toast.Style.Success;
                toast.title = "Command executed successfully!";
                // toast.message = `Transaction link: ${link}`;
              } catch (error) {
                console.error("Command error:", error);
                toast.style = Toast.Style.Failure;
                toast.title = "Command execution failed";
                toast.message = String(error);
              } finally {
                setLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="command" title="Command" placeholder="Send 0.1 USDC to 0x..." />
    </Form>
  );

  if (loading) {
    return <Detail markdown="# Executing command..." />;
  }

  if (transactionLink) {
    const markdown = `
# Transaction Executed Successfully!
`;
    return <Detail markdown={markdown} navigationTitle="Transaction Link" />;
  }

  return executeCommandForm;
}
