import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, confirmAlert, useNavigation } from "@raycast/api";
import { getModelName } from "../lib/OpenAI";
import Backup from "../services/Backup";
import { useActionsState } from "../store/actions";
import { createActionDeepLink } from "../utils";
import CommandExecute from "./CommandExecute";
import CommandForm from "./CommandForm";

export default function CommandList() {
  const navigation = useNavigation();
  const actions = useActionsState((state) => state.actions.sort((a, b) => a.name.localeCompare(b.name)));

  const removeAction = useActionsState((state) => state.removeAction);

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

  return (
    <List
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Backup">
            <Action title="Create New Action" icon={Icon.Plus} onAction={() => navigation.push(<CommandForm />)} />
            <Action title="Import Actions" icon={Icon.Upload} onAction={() => Backup.import()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title="Actions">
        {actions.map((action) => (
          <List.Item
            key={action.id}
            icon="👋"
            title={action.name}
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
                    onAction={() => navigation.push(<CommandForm id={action.id} />)}
                  />
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
        ))}
      </List.Section>
    </List>
  );
}
