import { Form, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { config } from "./config";

interface Preferences {
  authCode: string;
}

type Values = {
  command: string;
};

interface AIResponse {
  response: string;
}

const CHAIN = "mode";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [command, setCommand] = useState("");

  // Loading animation frames
  const loadingFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [loadingFrame, setLoadingFrame] = useState(0);

  // Animate the loader
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingFrame((frame) => (frame + 1) % loadingFrames.length);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    const url = `${config.apiUrl}/call/agent/public`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-Key": preferences.authCode,
        },
        body: JSON.stringify({
          prompt: values.command,
          chain: CHAIN,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Type guard to check if the response matches our interface
      if (typeof data === "object" && data !== null && "response" in data && typeof data.response === "string") {
        setResponse(data as AIResponse);
      } else {
        throw new Error("Invalid response format from server");
      }

      setCommand("");

      showToast({
        title: "Success",
        message: "Command processed",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to process command",
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // If we have a response, show the Detail view with markdown
  if (!isLoading && response) {
    // Convert markdown image links to Raycast's image syntax
    const modifiedMarkdown = response.response.replace(
      /\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|svg|webp))\)/gi,
      "![]($2)",
    );

    return (
      <Detail
        markdown={modifiedMarkdown}
        actions={
          <ActionPanel>
            <Action.Push title="New Command" icon={Icon.Terminal} target={<Command />} />
          </ActionPanel>
        }
      />
    );
  }

  // Show the command input form when no response
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Send Command" icon={Icon.Terminal} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your command below" />
      <Form.TextArea
        id="command"
        title="Command"
        placeholder="Enter your command here..."
        enableMarkdown
        autoFocus
        value={command}
        onChange={(value) => setCommand(value)}
      />

      {isLoading && (
        <>
          <Form.Separator />
          <Form.Description text={`${loadingFrames[loadingFrame]} Processing your request...`} />
        </>
      )}
    </Form>
  );
}
