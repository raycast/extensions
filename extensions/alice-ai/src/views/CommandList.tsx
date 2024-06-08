import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, confirmAlert, useNavigation } from "@raycast/api";
import { getModelName } from "../lib/OpenAI";
import Backup from "../services/Backup";
import { useActionsState } from "../store/actions";
import { Action as ActionModel } from "../types";
import { createActionDeepLink } from "../utils";
import CommandExecute from "./CommandExecute";
import CommandForm from "./CommandForm";

export default function CommandList() {
  const navigation = useNavigation();
  const actions = useActionsState((state) => state.actions.sort((a, b) => a.name.localeCompare(b.name)));
  const favoriteActions = actions.filter((a) => a.favorite);
  const otherActions = actions.filter((a) => !a.favorite);

  const addAction = useActionsState((state) => state.addAction);
  const removeAction = useActionsState((state) => state.removeAction);
  const addToFavorites = useActionsState((state) => state.addToFavorites);
  const removeFromFavorites = useActionsState((state) => state.removeFromFavorites);

  const handleBack = () => navigation.pop();

  const remove = async (id: string) => {
    if (
      await confirmAlert({
        title: "Delete Action",
        message: "Are you sure you want to delete this action?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      removeAction(id);
    }
  };

  const duplicate = async (id: string) => {
    const action = actions.find((a) => a.id === id);
    if (!action) {
      return;
    }

    addAction(action);
  };

  const renderActionItem = (action: ActionModel, icon: string) => {
    return (
      <List.Item
        key={action.id}
        title={action.name}
        icon={{ source: icon, tintColor: action.color }}
        subtitle={action.description}
        accessories={[
          {
            tag: {
              color: Color.SecondaryText,
              value: getModelName(action.model),
            },
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Manage">
              <Action title="Run Action" icon={Icon.Play} onAction={() => navigation.push(<CommandExecute id={action.id} />)} />
              <Action
                title="Edit"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={() => navigation.push(<CommandForm id={action.id} afterSubmit={handleBack} />)}
              />
              <Action
                title="Duplicate"
                icon={Icon.Duplicate}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                onAction={() => duplicate(action.id)}
              />
              {action.favorite ? (
                <Action
                  title="Remove From Favorites"
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  icon={Icon.StarDisabled}
                  onAction={() => removeFromFavorites(action.id)}
                />
              ) : (
                <Action
                  title="Add To Favorites"
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  icon={Icon.Star}
                  onAction={() => addToFavorites(action.id)}
                />
              )}
              <Action.CreateQuicklink
                title="Create Quicklink"
                shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
                quicklink={{
                  name: action.name,
                  link: createActionDeepLink(action.id),
                }}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => remove(action.id)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Backup">
              <Action title="Import Actions" icon={Icon.Upload} onAction={() => Backup.import()} />
              <Action title="Export Actions" icon={Icon.Download} onAction={() => Backup.export()} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Create Your First Action"
              icon={Icon.Plus}
              onAction={() => navigation.push(<CommandForm afterSubmit={handleBack} />)}
            />
            <Action title="Import Actions" icon={Icon.Upload} onAction={() => Backup.import()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {favoriteActions.length > 0 && (
        <List.Section title="Favorites">{favoriteActions.map((action) => renderActionItem(action, Icon.Checkmark))}</List.Section>
      )}
      <List.Section title="Actions">{otherActions.map((action) => renderActionItem(action, Icon.Dot))}</List.Section>
    </List>
  );
}
