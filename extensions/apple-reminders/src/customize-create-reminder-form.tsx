import { Action, ActionPanel, Icon, List } from "@raycast/api";

import useCreateReminderFormLayout, {
  CreateReminderFormLayoutItem,
  createReminderFieldDefinitions,
  createSeparatorItem,
  defaultCreateReminderFormLayout,
} from "./hooks/useCreateReminderFormLayout";

const fieldDefinitionMap = new Map(createReminderFieldDefinitions.map((field) => [field.id, field]));

function moveLayoutItem(layout: CreateReminderFormLayoutItem[], index: number, direction: -1 | 1) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= layout.length) {
    return layout;
  }

  const nextLayout = [...layout];
  const [item] = nextLayout.splice(index, 1);
  nextLayout.splice(targetIndex, 0, item);
  return nextLayout;
}

function insertSeparatorAfter(layout: CreateReminderFormLayoutItem[], index: number) {
  const nextLayout = [...layout];
  nextLayout.splice(index + 1, 0, createSeparatorItem());
  return nextLayout;
}

export default function CustomizeCreateReminderForm() {
  const { value: layout, setValue, isLoading } = useCreateReminderFormLayout();

  let separatorCount = 0;

  return (
    <List isLoading={isLoading}>
      <List.Section title="Create Reminder Form" subtitle="Toggle fields, move items, and place separators">
        {layout.map((item, index) => {
          if (item.type === "separator") {
            separatorCount += 1;

            return (
              <List.Item
                key={item.id}
                icon={Icon.Minus}
                title={`Separator ${separatorCount}`}
                subtitle="Divider between form sections."
                accessories={[{ text: "Separator" }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Add Separator Below"
                      icon={Icon.Plus}
                      onAction={() => setValue(insertSeparatorAfter(layout, index))}
                    />
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={() => setValue(moveLayoutItem(layout, index, -1))}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                      onAction={() => setValue(moveLayoutItem(layout, index, 1))}
                    />
                    <Action
                      title="Delete Separator"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => setValue(layout.filter((layoutItem) => layoutItem.id !== item.id))}
                    />
                    <Action
                      title="Reset to Defaults"
                      icon={Icon.ArrowCounterClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => setValue(defaultCreateReminderFormLayout)}
                    />
                  </ActionPanel>
                }
              />
            );
          }

          const definition = fieldDefinitionMap.get(item.id);
          if (!definition) {
            return null;
          }

          const dependencyDisabled = definition.dependsOn
            ? !layout.some(
                (layoutItem) =>
                  layoutItem.type === "field" && layoutItem.id === definition.dependsOn && layoutItem.enabled,
              )
            : false;
          const canToggle = !definition.required;

          return (
            <List.Item
              key={item.id}
              icon={definition.icon}
              title={definition.title}
              subtitle={definition.description}
              accessories={[
                ...(dependencyDisabled ? [{ tag: "Requires Date" }] : []),
                { text: item.enabled ? "On" : "Off", icon: item.enabled ? Icon.CheckCircle : Icon.Circle },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Add Separator Below"
                    icon={Icon.Plus}
                    onAction={() => setValue(insertSeparatorAfter(layout, index))}
                  />
                  {canToggle ? (
                    <Action
                      title={item.enabled ? "Turn Off" : "Turn On"}
                      icon={item.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                      onAction={() =>
                        setValue(
                          layout.map((layoutItem) =>
                            layoutItem.type === "field" && layoutItem.id === item.id
                              ? {
                                  ...layoutItem,
                                  enabled: !layoutItem.enabled,
                                }
                              : layoutItem,
                          ),
                        )
                      }
                    />
                  ) : null}
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    onAction={() => setValue(moveLayoutItem(layout, index, -1))}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    onAction={() => setValue(moveLayoutItem(layout, index, 1))}
                  />
                  <Action
                    title="Reset to Defaults"
                    icon={Icon.ArrowCounterClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => setValue(defaultCreateReminderFormLayout)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
