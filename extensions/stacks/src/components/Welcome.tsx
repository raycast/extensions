import { useState } from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { saveApiToken } from "../utils/graphql";

export default function Welcome({ onComplete }: { onComplete: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit({ token }: { token: string }) {
    if (!token.trim()) return;

    setIsLoading(true);
    try {
      await saveApiToken(token.trim());
      onComplete();
    } catch (error) {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Welcome to Stacks"
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="About This Extension"
            icon={Icon.Info}
            url="https://github.com/raycast/extensions/tree/main/extensions/stacks"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="" />
      <Form.Description text="" />
      <Form.Description text="" />

      <Form.Description
        title="Welcome to Stacks"
        text="Before you can start using this command, you will need to add a few things to the settings, listed below"
      />

      <Form.TextField id="token" title="Access Token" placeholder="Paste your gqlToken here" />

      <Form.Description title="" text="Find this in your browser's cookies at app.betterstacks.com" />
    </Form>
  );
}
