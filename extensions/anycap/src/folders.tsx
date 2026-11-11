import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { callTool, parseFolders } from "./anycap";
import { CaptureList } from "./captures";

export default function BrowseFolders() {
  const { data, isLoading, error } = useCachedPromise(async () => parseFolders(await callTool("categories", {})), []);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter folders">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Anycap did not answer" description={error.message} />
      ) : (
        <List.EmptyView icon={Icon.Folder} title="No folders yet" description="Create a folder in Anycap." />
      )}
      {(error ? [] : (data ?? [])).map((folder) => (
        <List.Item
          key={folder.name}
          icon={folder.emoji ?? (folder.name === "Inbox" ? Icon.Tray : Icon.Folder)}
          title={folder.name}
          subtitle={folder.description}
          accessories={[{ text: String(folder.count) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Captures"
                icon={Icon.List}
                target={
                  <CaptureList
                    navigationTitle={folder.name}
                    placeholder={`Filter ${folder.name}`}
                    filtering
                    load={() =>
                      folder.name === "Inbox"
                        ? callTool("recent", { days: 3650, category: "Inbox", limit: Number.MAX_SAFE_INTEGER })
                        : callTool("list", { folder: folder.name, limit: Number.MAX_SAFE_INTEGER })
                    }
                    emptyTitle={() => "Nothing in this folder"}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
