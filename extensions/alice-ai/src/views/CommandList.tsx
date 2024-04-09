import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, confirmAlert, useNavigation } from "@raycast/api";
import { getModelName } from "../lib/OpenAI";
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
    <List>
      <List.Item
        icon="➕"
        title="Create a New Action"
        actions={
          <ActionPanel>
            <Action title="Create a New Action" onAction={() => navigation.push(<CommandForm />)} />
          </ActionPanel>
        }
      />
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
                <ActionPanel.Section>
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
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(action.id)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
