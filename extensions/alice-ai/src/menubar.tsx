import { Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { useActionsAreReady, useActionsState } from "./store/actions";
import { useHistoryState } from "./store/history";
import { truncateText } from "./utils";

export default function MenuBar() {
  const ready = useActionsAreReady();
  const actions = useActionsState((state) => state.actions.sort((a, b) => a.name.localeCompare(b.name)));
  const history = useHistoryState((state) => state.history.sort((a, b) => b.timestamp - a.timestamp));

  const regular = actions.filter((action) => !action.favorite);
  const favorites = actions.filter((action) => action.favorite);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openCommand = (name: string, args?: Record<string, any>) => {
    launchCommand({
      ownerOrAuthorName: "quiknull",
      extensionName: "alice-ai",
      type: LaunchType.UserInitiated,
      name,
      arguments: args,
    });
  };

  const renderFavorites = () => {
    if (favorites.length > 0) {
      return (
        <MenuBarExtra.Section title="Favorites">
          {favorites.map((action) => (
            <MenuBarExtra.Item
              key={action.id}
              title={action.name}
              icon={{ source: Icon.Checkmark, tintColor: action.color }}
              onAction={() => {
                openCommand("commands", { id: action.id });
              }}
            />
          ))}
        </MenuBarExtra.Section>
      );
    }

    return null;
  };

  const renderRegular = () => {
    return regular.map((action) => (
      <MenuBarExtra.Item
        key={action.id}
        title={action.name}
        icon={{ source: Icon.Dot, tintColor: action.color }}
        onAction={() => {
          openCommand("commands", { id: action.id });
        }}
      />
    ));
  };

  return (
    <MenuBarExtra isLoading={!ready} icon={Icon.Wand} tooltip="Alice AI">
      {renderFavorites()}
      <MenuBarExtra.Section title="Actions" />
      {renderRegular()}
      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title="History" icon={Icon.Clock}>
          {history.map((item) => (
            <MenuBarExtra.Item
              key={item.id}
              title={truncateText(item.prompt, 64)}
              subtitle={`\n${truncateText(item.result, 64)}\n${item.action.name}`}
              icon={{ source: Icon.Clock, tintColor: item.action.color }}
              onAction={() => {
                openCommand("history", { id: item.id });
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Create Action" icon={Icon.Plus} onAction={() => openCommand("create")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
