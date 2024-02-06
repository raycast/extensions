import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import ViewCodeAction from "./components/ViewCodeAction";
import useStoredRecents from "./hooks/useStoredRecents";
import { smcUrl } from "./Constants";

export default function RecentCommand() {
  const { recents, deleteRecent, clearRecents } = useStoredRecents();

  return (
    <List navigationTitle="Recent code shared">
      {recents.length === 0 ? (
        <List.EmptyView icon={Icon.Code} title="You haven't created any ShareMyCode (yet!)" />
      ) : (
        recents.map((recent) => {
          const accessories: object[] = [{ date: new Date(recent.date) }];
          recent.language != "Unknown" &&
            accessories.unshift({ tag: { value: recent.language, color: Color.Yellow }, icon: Icon.Code });
          return (
            <List.Item
              key={recent.slug}
              title={recent.slug}
              subtitle={
                recent.content.length > 25 ? recent.content.replace("\n", "").substring(0, 50) + "..." : recent.content
              }
              icon={{ source: "smc.svg" }}
              accessories={accessories}
              actions={
                <ActionPanel title={`sharemycode.fr/${recent.slug}`}>
                  <ActionPanel.Section>
                    <ViewCodeAction slug={recent.slug} />
                    <Action.OpenInBrowser title="Open in Browser" url={`${smcUrl}/${recent.slug}`} />
                    <Action.CopyToClipboard title="Copy Content" content={recent.content} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage recents">
                    <RemoveRecentAction
                      onDelete={() => {
                        deleteRecent(recent.slug);
                      }}
                    />
                    <ClearRecentsAction
                      onClear={() => {
                        clearRecents();
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function RemoveRecentAction({ onDelete }: { onDelete: () => void }) {
  return (
    <Action
      title="Remove From Recents"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={onDelete}
    />
  );
}

function ClearRecentsAction({ onClear }: { onClear: () => void }) {
  return (
    <Action title="Clear All Recents" style={Action.Style.Destructive} icon={Icon.XMarkCircle} onAction={onClear} />
  );
}
