import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import type { SortOption, WorkspaceWithMetadata } from "../types";

type Props = {
  workspaces: WorkspaceWithMetadata[];
  isLoading: boolean;
  sortOption: SortOption;
  onOpen: (w: WorkspaceWithMetadata) => Promise<void>;
  onToggleFavorite: (w: WorkspaceWithMetadata) => Promise<void>;
  onOpenTerminal: (w: WorkspaceWithMetadata) => Promise<void>;
  onRevealInFinder: (w: WorkspaceWithMetadata) => Promise<void>;
  onDelete: (w: WorkspaceWithMetadata) => Promise<void>;
  onSortChange: (sortOption: SortOption) => Promise<void>;
};

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "";

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export default function WorkspaceList({
  workspaces,
  isLoading,
  sortOption,
  onOpen,
  onToggleFavorite,
  onOpenTerminal,
  onRevealInFinder,
  onDelete,
  onSortChange,
}: Props) {
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search VS Code workspaces..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort By"
          value={sortOption}
          onChange={(newValue) => onSortChange(newValue as SortOption)}
        >
          <List.Dropdown.Item title="Recently Opened" value="recently-opened" />
          <List.Dropdown.Item title="Alphabetical (A-Z)" value="alphabetical" />
          <List.Dropdown.Item title="Favorites First" value="favorites-first" />
          <List.Dropdown.Item title="Project Type" value="project-type" />
        </List.Dropdown>
      }
    >
      {workspaces.map((w) => {
        const accessories: List.Item.Accessory[] = [];

        // favorite star
        if (w.metadata.isFavorite) {
          accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
        }

        // time ago if recently opened
        if (w.metadata.lastOpened) {
          accessories.push({ text: formatTimeAgo(w.metadata.lastOpened) });
        }

        // keywords for fuzzy search
        const keywords = [w.name, w.name.replace(/[-_\s]/g, ""), w.path];

        return (
          <List.Item
            key={w.id}
            title={w.name}
            subtitle={w.path}
            icon={{ source: w.icon }}
            accessories={accessories}
            keywords={keywords}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Open">
                  <Action title="Open in VS Code" icon={Icon.Code} onAction={async () => await onOpen(w)} />
                  <Action.OpenWith shortcut={Keyboard.Shortcut.Common.OpenWith} path={w.path} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Quick Actions">
                  <Action
                    title={w.metadata.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    icon={w.metadata.isFavorite ? Icon.StarDisabled : Icon.Star}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    onAction={async () => await onToggleFavorite(w)}
                  />
                  <Action
                    title="Open in Terminal"
                    icon={Icon.Terminal}
                    shortcut={{ Windows: { modifiers: ["ctrl"], key: "t" }, macOS: { modifiers: ["cmd"], key: "t" } }}
                    onAction={async () => await onOpenTerminal(w)}
                  />
                  <Action
                    title={process.platform === "darwin" ? "Reveal in Finder" : "Reveal in Explorer"}
                    icon={process.platform === "darwin" ? Icon.Finder : Icon.Folder}
                    shortcut={{ Windows: { modifiers: ["ctrl"], key: "e" }, macOS: { modifiers: ["cmd"], key: "e" } }}
                    onAction={async () => await onRevealInFinder(w)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Clipboard">
                  <Action.CopyToClipboard
                    title="Copy Path"
                    shortcut={Keyboard.Shortcut.Common.CopyPath}
                    content={w.path}
                  />
                  <Action.CopyToClipboard
                    title="Copy Name"
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                    content={w.name}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Workspace"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      try {
                        await onDelete(w);
                      } catch (err) {
                        console.error("Delete action failed:", err);
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
