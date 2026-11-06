import { Action, ActionPanel, Detail } from "@raycast/api";
import { codeBlock } from "../lib/request";

/** Read-only, syntax-highlighted view of a query (Raycast text areas cannot highlight code). */
export function QueryPreview({ name, query }: { name: string; query: string }) {
  return (
    <Detail
      navigationTitle={name}
      markdown={query.trim() ? codeBlock("graphql", query.trim()) : "_Empty query_"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Query" content={query} />
        </ActionPanel>
      }
    />
  );
}
