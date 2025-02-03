import { Action, ActionPanel, Form, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { FuelAgent } from "fuel-agent-kit";
import fetch from "node-fetch";
import { useState } from "react";

if (!globalThis.fetch) {
  Object.defineProperty(globalThis, "fetch", {
    value: fetch,
    writable: true,
    configurable: true,
  });
}

export default function Command() {
  const preferences = getPreferenceValues();

  const [command, setCommand] = useState(""); // Track command input
  const [isExecuting, setIsExecuting] = useState(false);

  const agent = new FuelAgent({
    openAiApiKey: preferences.openaiApiKey,
    walletPrivateKey: preferences.fuelWalletPrivateKey,
    model: "gpt-4o",
  });

  async function handleSubmit(values: { command: string }) {
    setIsExecuting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Executing your command...",
    });

    try {
      const response = await agent.execute(values.command);
      // If the output text has a URL, show it in the success message
      const linkMatch = response.output.match(/https?:\/\/[^\s]+/);
      const link = linkMatch ? linkMatch[0] : null;
      console.log(link);

      // Update toast to success
      toast.style = Toast.Style.Success;
      toast.title = "Command executed successfully!";
      // toast.message = link ? `Transaction link: ${link}` : undefined;

      open("raycast://confetti");

      // Clear the form
      setCommand("");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Command execution failed";
      toast.message = String(error);
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <Form
      isLoading={isExecuting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Command" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="command"
        title="Command"
        placeholder="Send 1 USDC to 0x..."
        value={command}
        onChange={setCommand}
      />
    </Form>
  );
}
