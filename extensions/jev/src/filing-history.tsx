import { Action, ActionPanel, Detail, Icon, List, confirmAlert } from "@raycast/api";
import path from "node:path";
import { recoverMove, undoMove } from "./lib/files";
import { ErrorView, markdown, store, task, useData } from "./lib/ui";
export default function Command() {
  const { data, loading, error, refresh } = useData();
  if (error) return <ErrorView error={error} />;
  return (
    <List isLoading={loading} searchBarPlaceholder="Search document moves…">
      <List.EmptyView
        title="No Documents Filed Yet"
        description="Moves appear here with their original locations and an undo action."
      />
      {data.moves.map((m) => (
        <List.Item
          key={m.id}
          title={path.basename(m.source)}
          subtitle={m.destination}
          icon={m.status === "moved" ? Icon.CheckCircle : Icon.Document}
          accessories={[{ tag: m.status }, { date: new Date(m.createdAt) }]}
          actions={
            <ActionPanel>
              {m.status === "moved" && (
                <Action
                  title="Undo Move"
                  icon={Icon.Undo}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Restore the original location?",
                        message: m.source,
                        primaryAction: { title: "Undo Move" },
                      })
                    )
                      await task("Restoring document", async () => {
                        await undoMove(store, m.id);
                        await refresh();
                      });
                  }}
                />
              )}
              <Action.Push
                title="Inspect Move"
                target={
                  <Detail
                    markdown={`# ${markdown(path.basename(m.source))}\n\n**From:** ${markdown(m.source)}\n\n**To:** ${markdown(m.destination)}\n\nStatus: ${m.status}\n\n${markdown(m.error ?? "")}`}
                  />
                }
              />
              <Action
                title="Reconcile Interrupted Move"
                onAction={() =>
                  task("Checking both locations", async () => {
                    await recoverMove(store, m.id);
                    await refresh();
                  })
                }
              />
              <Action.CopyToClipboard title="Copy Original Path" content={m.source} />
              <Action.CopyToClipboard title="Copy Destination Path" content={m.destination} />
              <Action title="Refresh" onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
