import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { AuthenticateView } from "./components/authenticate-view";
import { listKnowledgeBases } from "./lib/api";
import { normalizeGetNoteError } from "./lib/errors";
import { knowledgeBasePreviewMarkdown } from "./lib/format";
import { KnowledgeBase } from "./lib/types";
import { useGetNoteCredentials } from "./hooks/use-getnote-credentials";

export default function KnowledgeBasesCommand() {
  const { credentials, isLoading: isAuthLoading, reload } = useGetNoteCredentials();
  const [topics, setTopics] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listKnowledgeBases();
      setTopics(data.topics || []);
    } catch (nextError) {
      setError(normalizeGetNoteError(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (credentials) {
      void load();
    }
  }, [credentials]);

  if (isAuthLoading) {
    return <List isLoading searchBarPlaceholder="Checking GetNote connection..." />;
  }

  if (!credentials) {
    return <AuthenticateView onConnected={reload} />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter knowledge bases">
      {error ? <List.EmptyView title="Failed to Load" description={error} /> : null}
      {!error && !isLoading && topics.length === 0 ? <List.EmptyView title="No Knowledge Bases Yet" /> : null}
      {topics.map((topic) => (
        <List.Item
          key={topic.topic_id}
          title={topic.name}
          subtitle={topic.description || ""}
          accessories={[{ text: `${topic.stats?.note_count ?? 0} notes` }]}
          detail={<List.Item.Detail markdown={knowledgeBasePreviewMarkdown(topic)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Topic ID" content={topic.topic_id} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
