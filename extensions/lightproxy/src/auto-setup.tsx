import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { runLightproxyCommand } from "./utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { tld: string }) {
    try {
      setIsLoading(true);

      const { tld } = values;
      if (!tld) {
        throw new Error("TLD is required");
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Setting up LightProxy",
        message: `Using TLD: ${tld}`,
      });

      await runLightproxyCommand(["auto-setup", "--tld", tld]);

      await showToast({
        style: Toast.Style.Success,
        title: "LightProxy Setup Complete",
        message: `Successfully set up with TLD: ${tld}`,
      });
    } catch (error) {
      console.error("Error in auto-setup:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Failed",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Auto Setup" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tld"
        title="Top-Level Domain"
        placeholder="Enter TLD (e.g., test, dev, local)"
        info="The TLD to use for your local services"
        defaultValue="test"
        autoFocus
      />
    </Form>
  );
}
