import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { AuthGuard } from "./lib/auth-guard";
import { runHey } from "./lib/hey";
import type { HeyDraft } from "./lib/types";

export default function DraftsCommand() {
  return (
    <AuthGuard>
      <DraftsList />
    </AuthGuard>
  );
}

function DraftsList() {
  const { isLoading, data, error, revalidate } = usePromise(async () => {
    const response = await runHey<HeyDraft[]>(["drafts", "--json"]);
    return response.data;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search drafts…">
      {error ? (
        <List.EmptyView
          title="Could Not Load Drafts"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {(data ?? []).map((draft) => (
        <List.Item
          key={draft.id}
          title={draft.name || "Untitled draft"}
          subtitle={draft.creator?.name ?? draft.summary?.slice(0, 60)}
          accessories={draft.summary ? [{ text: draft.summary.slice(0, 80) }] : undefined}
          actions={
            <ActionPanel>
              <Action title="Open in HEY" icon={Icon.Globe} onAction={() => open(draft.app_url)} />
              <Action.CopyToClipboard title="Copy Link" content={draft.app_url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
