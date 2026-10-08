import { Action, ActionPanel, List, Icon, confirmAlert, showToast, Alert, Toast, Keyboard } from "@raycast/api";
import { $environments, $currentEnvironmentId, deleteVariable, deleteEnvironment } from "../store/environments";
import { EnvironmentForm } from "./environment-form";
import { VariableForm } from "./variable-form";
import { useAtom } from "zod-persist/react";
import { GlobalActions } from "~/components/actions";

function EnvironmentDropdown() {
  const { value: environments } = useAtom($environments);
  const { value: activeId } = useAtom($currentEnvironmentId);

  return (
    <List.Dropdown
      tooltip="Select Environment"
      value={activeId ?? undefined}
      onChange={(newValue) => $currentEnvironmentId.set(newValue)}
    >
      <List.Dropdown.Section title="Environments">
        {environments.map((env) => (
          <List.Dropdown.Item key={env.id} title={env.name} value={env.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function CommonActions() {
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);
  const { value: environments } = useAtom($environments);
  const currentEnvironment = environments.find((e) => e.id === currentEnvironmentId);
  return (
    <>
      <ActionPanel.Section>
        {/* Actions for the selected environment */}
        {currentEnvironment?.id && (
          <Action.Push
            title="Add Variable"
            target={<VariableForm environmentId={currentEnvironment?.id} />}
            shortcut={Keyboard.Shortcut.Common.New}
            icon={Icon.PlusCircle}
          />
        )}

        <Action.Push
          title="Edit Environment"
          target={<EnvironmentForm environmentId={currentEnvironment?.id} />}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "e" },
            windows: { modifiers: ["ctrl", "shift"], key: "e" },
          }}
          icon={Icon.Pencil}
        />
        <Action.Push
          title="Create New Environment"
          target={<EnvironmentForm />}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "n" },
            windows: { modifiers: ["ctrl", "shift"], key: "n" },
          }}
          icon={Icon.PlusTopRightSquare}
        />
        {currentEnvironment && (
          <Action
            title="Delete Environment"
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: `Delete "${currentEnvironment.name}"?`,
                  message: "All variables within this environment will be deleted.",
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await deleteEnvironment(currentEnvironment.id);
                await showToast({ style: Toast.Style.Success, title: "Environment Deleted" });
              }
            }}
          />
        )}
      </ActionPanel.Section>
      <GlobalActions />
    </>
  );
}
export function ManageVariablesList() {
  const { value: environments } = useAtom($environments);
  const { value: activeId } = useAtom($currentEnvironmentId);

  const currentEnvironment = environments.find((env) => env.id === activeId);
  const variables = currentEnvironment ? Object.entries(currentEnvironment.variables) : [];

  return (
    <List
      navigationTitle="Manage Variables"
      searchBarAccessory={<EnvironmentDropdown />}
      actions={
        <ActionPanel>
          <CommonActions />
        </ActionPanel>
      }
    >
      {variables.map(([key, variable]) => (
        <List.Item
          key={key}
          title={key}
          accessories={[{ text: variable.isSecret ? "********" : variable.value }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Variable"
                target={<VariableForm environmentId={currentEnvironment!.id} variableKey={key} />}
                icon={Icon.Pencil}
              />
              {currentEnvironment && (
                <Action
                  title="Delete Variable"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: `Delete Variable "${key}"?`,
                        message: "This action cannot be undone.",
                        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      await deleteVariable(currentEnvironment.id, key);
                      await showToast({ style: Toast.Style.Success, title: "Variable Deleted" });
                    }
                  }}
                />
              )}

              <CommonActions />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
