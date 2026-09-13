import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { CustomEngineData, Engine } from "../engines";
import { EngineForm } from "./EngineForm";

export function ManageEnginesView(props: {
  engines: Engine[];
  onAdd: (data: Omit<CustomEngineData, "id">) => Promise<void>;
  onUpdate: (id: string, data: Omit<CustomEngineData, "id">) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const { engines, onAdd, onUpdate, onRemove } = props;
  const customEngines = engines.filter((e) => e.isCustom);

  return (
    <List navigationTitle="Manage Custom Search Engines" searchBarPlaceholder="Filter custom engines…">
      {customEngines.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Custom Search Engines"
          description="Add search websites like Yahoo, Brave, or GitHub."
          actions={
            <ActionPanel>
              <Action.Push title="Add Custom Search Engine" icon={Icon.Plus} target={<EngineForm onSave={onAdd} />} />
            </ActionPanel>
          }
        />
      ) : (
        customEngines.map((engine) => (
          <List.Item
            key={engine.id}
            title={engine.title}
            subtitle={engine.rawSearchUrl}
            icon={engine.icon}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Search Engine"
                    icon={Icon.Pencil}
                    target={<EngineForm engine={engine} onSave={(data) => onUpdate(engine.id, data)} />}
                  />
                  <Action.Push
                    title="Add Custom Search Engine"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={<EngineForm onSave={onAdd} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Remove Search Engine"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: `Remove "${engine.title}"?`,
                          message: "Are you sure you want to remove this custom search engine?",
                          primaryAction: {
                            title: "Remove",
                            style: Alert.ActionStyle.Destructive,
                          },
                        })
                      ) {
                        await onRemove(engine.id);
                        await showToast({ style: Toast.Style.Success, title: `Removed ${engine.title}` });
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
