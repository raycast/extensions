import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

interface Prompt {
  id: string;
  name: string;
  description: string;
}

export default function Command() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchPrompts() {
      try {
        // Get current context
        const contextRes = await fetch("https://logggai.run/api/user/context", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const contextData = (await contextRes.json()) as { organizationId?: string };
        const orgId = contextData.organizationId;
        // Fetch prompts for current context
        const promptsUrl = orgId
          ? `https://logggai.run/api/prompts?organizationId=${orgId}`
          : "https://logggai.run/api/prompts";
        const res = await fetch(promptsUrl, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { prompts?: Prompt[] };
        setPrompts(data.prompts || []);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch prompts" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchPrompts();
  }, [sessionToken]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search prompts...">
      {prompts.map((prompt) => (
        <List.Item key={prompt.id} title={prompt.name} subtitle={prompt.description} />
      ))}
    </List>
  );
}
