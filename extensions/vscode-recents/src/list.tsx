import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { useFavorites } from "./hooks/useFavorites";

export default function Command() {
  const { favorites, remove, refresh, open } = useFavorites();

  return (
    <List
      navigationTitle="VSCode Favorites"
      actions={
        <ActionPanel>
          <Action
            title="Add New Favorite"
            icon={Icon.NewDocument}
            shortcut={{ key: "n", modifiers: ["cmd"] }}
            onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      {favorites.map((favorite) => (
        <List.Item
          key={favorite.name}
          title={favorite.name}
          subtitle={favorite.path[0]}
          actions={
            <ActionPanel title={favorite.name}>
              <Action title="Open in VSCode" icon={"vscode.png"} onAction={() => open(favorite.id)} />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Remove from Favorites"
                shortcut={{ key: "x", modifiers: ["ctrl"] }}
                onAction={async () => {
                  await remove(favorite.id);
                  await refresh();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
