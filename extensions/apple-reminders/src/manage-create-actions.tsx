import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";

import usePostCreateActions, {
  PostCreateAction,
  postCreateActionScopeOptions,
  PostCreateActionScope,
} from "./hooks/usePostCreateActions";
import { Shortcut, listShortcuts } from "./shortcuts";

function moveAction(actions: PostCreateAction[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= actions.length) {
    return actions;
  }

  const nextActions = [...actions];
  const [item] = nextActions.splice(index, 1);
  nextActions.splice(nextIndex, 0, item);
  return nextActions;
}

function upsertAction(actions: PostCreateAction[], action: PostCreateAction) {
  const existingIndex = actions.findIndex((item) => item.id === action.id);
  if (existingIndex === -1) {
    return [...actions, action];
  }

  return actions.map((item) => (item.id === action.id ? action : item));
}

function EditActionForm({
  action,
  onSubmit,
}: {
  action: PostCreateAction;
  onSubmit: (action: PostCreateAction) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const { itemProps, handleSubmit } = useForm<{ shortcutName: string; enabled: boolean; scope: string }>({
    initialValues: {
      shortcutName: action.shortcutName,
      enabled: action.enabled,
      scope: action.scope,
    },
    validation: {
      shortcutName: FormValidation.Required,
    },
    async onSubmit(values) {
      await onSubmit({
        ...action,
        shortcutName: values.shortcutName,
        enabled: values.enabled,
        scope: values.scope as PostCreateActionScope,
      });
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Edit Create Action"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Action" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="The selected Shortcut runs after reminder creation. No input is passed to it." />
      <Form.TextField {...itemProps.shortcutName} title="Display Name" />
      <Form.Dropdown {...itemProps.scope} title="Scope">
        {postCreateActionScopeOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox {...itemProps.enabled} label="Enabled" />
    </Form>
  );
}

function AddShortcutList({
  configuredActions,
  onAdd,
}: {
  configuredActions: PostCreateAction[];
  onAdd: (shortcut: Shortcut) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const { data: shortcuts, isLoading, revalidate } = useCachedPromise(listShortcuts);

  const configuredIds = new Set(configuredActions.map((action) => action.shortcutIdentifier));

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Add Shortcut Action"
      searchBarPlaceholder="Search available shortcuts"
      actions={
        <ActionPanel>
          <Action title="Refresh Shortcuts" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      <List.Section title="Available Shortcuts">
        {(shortcuts ?? []).map((shortcut) => {
          const alreadyAdded = configuredIds.has(shortcut.id);

          return (
            <List.Item
              key={shortcut.id}
              icon={Icon.AppWindow}
              title={shortcut.name}
              accessories={alreadyAdded ? [{ tag: "Added" }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title={alreadyAdded ? "Already Added" : "Add Shortcut Action"}
                    icon={alreadyAdded ? Icon.CheckCircle : Icon.Plus}
                    onAction={async () => {
                      if (alreadyAdded) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Shortcut already added",
                          message: shortcut.name,
                        });
                        return;
                      }

                      await onAdd(shortcut);
                      pop();
                    }}
                  />
                  <Action title="Refresh Shortcuts" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const { value: actions, setValue, isLoading } = usePostCreateActions();

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Create Actions"
      searchBarPlaceholder="Search configured actions"
    >
      <List.Section title="Configured Actions" subtitle={`${actions.length}`}>
        {actions.map((action, index) => (
          <List.Item
            key={action.id}
            icon={action.enabled ? Icon.Bolt : Icon.Circle}
            title={action.shortcutName}
            subtitle={action.shortcutIdentifier}
            accessories={[
              {
                tag:
                  postCreateActionScopeOptions.find((option) => option.value === action.scope)?.title ?? action.scope,
              },
              { text: action.enabled ? "On" : "Off" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Shortcut Action"
                  icon={Icon.Plus}
                  target={
                    <AddShortcutList
                      configuredActions={actions}
                      onAdd={async (shortcut) => {
                        await setValue([
                          ...actions,
                          {
                            id: shortcut.id,
                            shortcutIdentifier: shortcut.id,
                            shortcutName: shortcut.name,
                            enabled: true,
                            scope: "all",
                          },
                        ]);
                      }}
                    />
                  }
                />
                <Action.Push
                  title="Edit Action"
                  icon={Icon.Pencil}
                  target={
                    <EditActionForm
                      action={action}
                      onSubmit={async (updatedAction) => {
                        await setValue(upsertAction(actions, updatedAction));
                      }}
                    />
                  }
                />
                <Action
                  title={action.enabled ? "Turn Off" : "Turn On"}
                  icon={action.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                  onAction={() =>
                    setValue(
                      actions.map((item) => (item.id === action.id ? { ...item, enabled: !item.enabled } : item)),
                    )
                  }
                />
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                  onAction={() => setValue(moveAction(actions, index, -1))}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                  onAction={() => setValue(moveAction(actions, index, 1))}
                />
                <Action
                  title="Remove Action"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => setValue(actions.filter((item) => item.id !== action.id))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        title="No Create Actions"
        description="Add a Shortcut to run after reminders are created."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Shortcut Action"
              icon={Icon.Plus}
              target={
                <AddShortcutList
                  configuredActions={actions}
                  onAdd={async (shortcut) => {
                    await setValue([
                      ...actions,
                      {
                        id: shortcut.id,
                        shortcutIdentifier: shortcut.id,
                        shortcutName: shortcut.name,
                        enabled: true,
                        scope: "all",
                      },
                    ]);
                  }}
                />
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
