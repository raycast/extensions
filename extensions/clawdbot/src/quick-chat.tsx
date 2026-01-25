import {
  Detail,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  ActionPanel,
  Action,
} from "@raycast/api";
import { execSync } from "child_process";
import { useState, useEffect } from "react";

interface Preferences {
  agentId?: string;
}

interface Arguments {
  message: string;
}

export default function Command(props: { arguments: Arguments }) {
  const { message } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function run() {
      if (!message.trim()) {
        setError("Please enter a message");
        setIsLoading(false);
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Thinking...",
        message: "Clawdbot is processing",
      });

      try {
        const agentFlag = preferences.agentId
          ? `--agent ${preferences.agentId}`
          : "";
        const escapedMessage = message.replace(/'/g, "'\\''");
        const result = execSync(
          `/opt/homebrew/bin/clawdbot agent --local --session-id raycast -m '${escapedMessage}' ${agentFlag} --timeout 120`,
          {
            encoding: "utf-8",
            timeout: 130000,
            maxBuffer: 10 * 1024 * 1024,
            env: {
              ...process.env,
              PATH: `/opt/homebrew/bin:${process.env.PATH}`,
            },
          },
        );

        const text = result.trim();
        setResponse(text);
        await Clipboard.copy(text);
        await showToast({
          style: Toast.Style.Success,
          title: "Response copied to clipboard",
        });
      } catch (err: unknown) {
        const e = err as { message?: string; stderr?: string };
        setError(e.stderr || e.message || "Failed");
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: e.stderr || e.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    run();
  }, [message]);

  if (error) {
    return <Detail markdown={`## ❌ Error\n\n${error}`} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={response ?? ""}
      actions={
        response ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Response" content={response} />
            <Action.Paste title="Paste Response" content={response} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
