import { ActionPanel, Action, Icon, List, confirmAlert, Color, showToast, Toast } from "@raycast/api";

import { Label as TLabel, updateLabel, deleteLabel as apiDeleteLabel, handleError, SyncData } from "../api";
import Label from "../components/Label";
import { getColorByKey } from "../helpers/colors";
import { isTodoistInstalled } from "../helpers/isTodoistInstalled";
import { getLabelAppUrl, getLabelUrl } from "../helpers/labels";

type LabelListItemProps = {
  label: TLabel;
  data?: SyncData;
  setData: React.Dispatch<React.SetStateAction<SyncData | undefined>>;
};

export default function LabelListItem({ label, data, setData }: LabelListItemProps) {
  async function toggleFavorite(label: TLabel) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: label.is_favorite ? "Removing from favorites" : "Adding to favorites",
      });

      await updateLabel({ id: label.id, is_favorite: !label.is_favorite }, { data, setData });

      await showToast({
        style: Toast.Style.Success,
        title: label.is_favorite ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error) {
      handleError({
        error,
        title: label.is_favorite ? "Unable to remove from favorites" : "Unable to add to favorites",
      });
    }
  }

  async function deleteLabel(id: string) {
    if (
      await confirmAlert({
        title: "Delete Label",
        message: "Are you sure you want to delete this label?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting label" });

        await apiDeleteLabel(id, { data, setData });

        await showToast({ style: Toast.Style.Success, title: "Label deleted" });
      } catch (error) {
        handleError({ error, title: "Unable to delete label" });
      }
    }
  }

  return (
    <List.Item
      key={label.id}
      icon={{ source: Icon.Tag, tintColor: getColorByKey(label.color).value }}
      title={label.name}
      accessories={[
        {
          icon: label.is_favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined,
          tooltip: label.is_favorite ? "Favorite" : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Sidebar} title="Show Tasks" target={<Label name={label.name} />} />
          {isTodoistInstalled ? (
            <Action.Open
              title="Open Label in Todoist"
              target={getLabelAppUrl(label.name)}
              icon="todoist.png"
              application="Todoist"
            />
          ) : (
            <Action.OpenInBrowser
              title="Open Label in Browser"
              url={getLabelUrl(label.id)}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}

          <ActionPanel.Section>
            <Action
              title={label.is_favorite ? "Remove From Favorites" : "Add to Favorites"}
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => toggleFavorite(label)}
            />

            <Action
              title="Delete Label"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => deleteLabel(label.id)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Label URL"
              content={getLabelUrl(label.id)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />

            <Action.CopyToClipboard
              title="Copy Label Title"
              content={label.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
