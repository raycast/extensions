import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Detail,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

interface Preferences {
  apiUrl: string;
  gatewayToken?: string;
  agentName: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!searchText) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // Call OpenClaw Chat Completions API
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (preferences.gatewayToken) {
        headers["Authorization"] = `Bearer ${preferences.gatewayToken}`;
      }

      const res = await fetch(`${preferences.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: preferences.agentName,
          messages: [{ role: "user", content: searchText }],
          stream: false,
        }),
      });

      if (!res.ok) throw new Error(`Error: ${res.statusText}`);

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = data.choices?.[0]?.message?.content || "No response";
      setResponse(reply);
      showToast({ style: Toast.Style.Success, title: "Response Received" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect OpenClaw",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (response) {
    return (
      <Detail
        markdown={response}
        actions={
          <ActionPanel>
            <Action
              title="New Chat"
              onAction={() => {
                setResponse(null);
                setSearchText("");
              }}
            />
            <Action.CopyToClipboard content={response} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Ask OpenClaw..."
      isLoading={isLoading}
      throttle={false}
    >
      <List.EmptyView
        icon="🤖"
        title="OpenClaw"
        description="Type your question and press Enter"
        actions={
          <ActionPanel>
            <Action title="Send" onAction={handleSubmit} />
          </ActionPanel>
        }
      />
    </List>
  );
}
