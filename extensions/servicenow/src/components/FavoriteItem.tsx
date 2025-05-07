import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import useInstances from "../hooks/useInstances";
import { Favorite } from "../types";
import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import FavoriteForm from "./FavoriteForm";
import Actions from "./Actions";
import { extractPathAndParam } from "../utils/extractPathAndParam";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";

export default function FavoriteItem(props: {
  favorite: Favorite;
  revalidate: () => void;
  group?: string;
  section?: string;
  removeFromFavorites: (id: string, title: string, isGroup: boolean, revalidate?: () => void) => void;
}) {
  const { favorite: favorite, revalidate, removeFromFavorites, group = "", section = "" } = props;
  const { selectedInstance } = useInstances();
  const { name: instanceName = "", full } = selectedInstance || {};
  const path = (favorite.url?.startsWith("/") ? favorite.url : `/${favorite.url}`) || "";

  if (favorite.separator) {
    return favorite.favorites?.map((f) => {
      return (
        <FavoriteItem
          key={f.id}
          favorite={f}
          revalidate={revalidate}
          group={group}
          section={favorite.title}
          removeFromFavorites={removeFromFavorites}
        />
      );
    });
  }

  const url = buildServiceNowUrl(instanceName, path);
  const table = favorite.table ? favorite.table : extractPathAndParam(path).path;
  const { icon: iconName, color: colorName } = getTableIconAndColor(table);

  const icon: Action.Props["icon"] = {
    source: Icon[iconName as keyof typeof Icon],
    tintColor: Color[colorName as keyof typeof Color],
  };

  const accessories: List.Item.Accessory[] = [
    {
      icon: Icon.Link,
      tooltip: decodeURIComponent(path),
    },
  ];

  if (section)
    accessories.unshift({
      tag: { value: section },
      tooltip: `Section: ${section}`,
    });

  return (
    <List.Item
      key={favorite.id}
      title={favorite.title}
      accessories={accessories}
      keywords={[...group.split(" "), ...section.split(" ")]}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={favorite.title}>
            <Action.OpenInBrowser title="Open in ServiceNow" url={url} icon={{ source: "servicenow.svg" }} />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyPath} />
          </ActionPanel.Section>
          {full == "true" && (
            <>
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={<FavoriteForm favorite={favorite} revalidate={revalidate} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() =>
                  confirmAlert({
                    title: "Delete Favorite",
                    message: `Are you sure you want to delete "${favorite.title}"?`,
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      onAction: () => {
                        removeFromFavorites(favorite.id, favorite.title, false, revalidate);
                      },
                    },
                  })
                }
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
              <ActionPanel.Section title="Add">
                <Action.Push
                  title="Favorites Group"
                  icon={Icon.Folder}
                  target={<FavoriteForm add="group" revalidate={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <Action.Push
                  title="Favorite"
                  icon={Icon.Star}
                  target={<FavoriteForm add="favorite" groupId={favorite.groupId} revalidate={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
              </ActionPanel.Section>
            </>
          )}
          <Actions revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
