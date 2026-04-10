// src/components/WatchTaskDetail.tsx
import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import type { ApiClient } from "../api/client";
import type { Repository, Task } from "../api/types";
import { useTaskState } from "../hooks/useTaskState";
import { useTaskStream, type StreamMessage } from "../hooks/useTaskStream";

interface Props {
  client: ApiClient;
  task: Task;
  repo?: Repository;
}

/**
 * Streaming message Detail view for a single task. Pushed onto the navigation
 * stack from List Tasks's ⌘K menu via Action.Push. Backfills history then
 * follows the SSE stream until the user pops the view (which closes the
 * connection via the useEffect cleanup in useTaskStream).
 */
export function WatchTaskDetail({ client, task, repo }: Props) {
  const { messages, isLoading, isComplete, error } = useTaskStream(client, task.id);
  const state = useTaskState(client, task.id);
  const { pop } = useNavigation();

  const markdown = formatStream(messages, error);
  const taskUrl = repo ? client.taskUrl(repo.fullName, task.id) : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={task.name || task.id}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={state.data?.state ?? task.status} />
          {state.data?.processing && <Detail.Metadata.Label title="Processing" text="Yes" />}
          {state.data?.queuedCount !== undefined && state.data.queuedCount > 0 && (
            <Detail.Metadata.Label title="Queued prompts" text={String(state.data.queuedCount)} />
          )}
          <Detail.Metadata.Label
            title="Stream"
            text={isComplete ? "Complete" : isLoading ? "Loading…" : "Live"}
          />
          {repo && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Repository" text={repo.fullName} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {taskUrl && <Action.OpenInBrowser url={taskUrl} />}
          <Action title="Stop Watching" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

/**
 * v1: dump each stream message as a fenced JSON code block. Polishing this
 * into nicely formatted assistant/user/tool turns is tracked as v1.1 work.
 */
function formatStream(messages: StreamMessage[], error: Error | null): string {
  if (messages.length === 0 && !error) {
    return "_Waiting for messages…_";
  }
  let md = "";
  for (const msg of messages) {
    md += "```json\n" + JSON.stringify(msg, null, 2) + "\n```\n\n";
  }
  if (error) {
    md += `\n---\n\n**Stream error:** ${error.message}\n`;
  }
  return md;
}
