import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAuth, AuthGate, streamChat } from "./shared";

interface QuickAskArguments {
  query: string;
}

export default function QuickAsk(
  props: LaunchProps<{ arguments: QuickAskArguments }>,
) {
  const { query } = props.arguments;
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { ghoToken, deviceFlow } = useAuth();

  useEffect(() => {
    if (!ghoToken || !query) return;

    const controller = new AbortController();
    streamChat(
      ghoToken,
      query,
      (content) => setMarkdown(content),
      () => setIsLoading(false),
      (error) => {
        setMarkdown(
          `**Error**: ${error instanceof Error ? error.message : String(error)}`,
        );
        setIsLoading(false);
      },
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [ghoToken, query]);

  return (
    <AuthGate ghoToken={ghoToken} deviceFlow={deviceFlow}>
      <Detail
        isLoading={isLoading}
        markdown={markdown || (isLoading ? "⚡️ Thinking..." : "")}
        navigationTitle={`Ask: ${query}`}
        actions={
          <ActionPanel>
            {markdown && (
              <Action.CopyToClipboard title="Copy Result" content={markdown} />
            )}
          </ActionPanel>
        }
      />
    </AuthGate>
  );
}
