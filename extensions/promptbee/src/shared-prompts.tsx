import { ActionPanel, Action, List, showToast, Toast, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { getValidAccessToken } from "./session";
import { API_BASE_URL } from "./constants";

type Prompt = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

export default function SharedPromptsCommand() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkLogin();
  }, []);

  async function checkLogin() {
    const token = await getValidAccessToken();
    if (!token) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    await loadPrompts(token);
  }

  async function loadPrompts(token: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/prompts/shared`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch prompts");

      const data: Prompt[] = (await res.json()) as Prompt[];
      setPrompts(data);
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load prompts" });
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <List isLoading={true} searchBarPlaceholder="Loading..." />;
  }

  if (signedIn === false) {
    return (
      <Detail
        markdown="### 🔑 Please sign in to PromptBee. You need to log in to access your saved prompts."
        actions={
          <ActionPanel>
            <Action.Open title="Sign in" target="raycast://extensions/promptbee/signin" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={false} searchBarPlaceholder="Shared prompts...">
      {prompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          title={prompt.title}
          accessories={prompt.tags?.map((t) => ({ text: `#${t}` })) || []}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={prompt.content} />
              <Action.OpenInBrowser url={`https://www.promptbee.dev/prompts/${prompt.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
