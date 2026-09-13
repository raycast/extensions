import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { Engine } from "../engines";
import { useMultiSearch } from "../multisearch";

export function MultiSearchConfigView(props: { engines: Engine[] }) {
  const { engines } = props;
  const { isEnabled, toggleMultiSearch, selectedEngineIds, selectedEngines, toggleEngine, moveEngine } =
    useMultiSearch(engines);

  const activeEngines = selectedEngines;
  const inactiveEngines = engines.filter((e) => !selectedEngineIds.includes(e.id));

  return (
    <List navigationTitle="Configure Multi-Search" searchBarPlaceholder="Filter engines…">
      <List.Section title="Multi-Search Status">
        <List.Item
          title="Multi-Search Mode"
          subtitle={isEnabled ? "Enabled (Opens multiple browser tabs in order)" : "Disabled (Opens single engine)"}
          icon={isEnabled ? Icon.CheckCircle : Icon.Circle}
          accessories={[{ text: isEnabled ? "ON" : "OFF" }]}
          actions={
            <ActionPanel>
              <Action
                title={isEnabled ? "Disable Multi-Search" : "Enable Multi-Search"}
                icon={isEnabled ? Icon.XMarkCircle : Icon.Checkmark}
                onAction={toggleMultiSearch}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Tab Order in Browser (${activeEngines.length} Selected)`}>
        {activeEngines.map((engine, index) => (
          <List.Item
            key={engine.id}
            title={engine.title}
            subtitle={engine.homepage}
            icon={engine.icon}
            accessories={[{ text: `Tab #${index + 1}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Reorder Tabs">
                  {index > 0 && (
                    <Action
                      title="Move Tab up"
                      icon={Icon.ArrowUp}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={() => moveEngine(engine.id, "up")}
                    />
                  )}
                  {index < activeEngines.length - 1 && (
                    <Action
                      title="Move Tab Down"
                      icon={Icon.ArrowDown}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={() => moveEngine(engine.id, "down")}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Selection">
                  <Action
                    title="Remove from Multi-Search"
                    icon={Icon.Minus}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => toggleEngine(engine.id)}
                  />
                  <Action
                    title={isEnabled ? "Disable Multi-Search" : "Enable Multi-Search"}
                    icon={isEnabled ? Icon.XMarkCircle : Icon.Checkmark}
                    onAction={toggleMultiSearch}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {inactiveEngines.length > 0 && (
        <List.Section title="Available Engines">
          {inactiveEngines.map((engine) => (
            <List.Item
              key={engine.id}
              title={engine.title}
              subtitle={engine.homepage}
              icon={engine.icon}
              actions={
                <ActionPanel>
                  <Action title="Add to Multi-Search" icon={Icon.Plus} onAction={() => toggleEngine(engine.id)} />
                  <Action
                    title={isEnabled ? "Disable Multi-Search" : "Enable Multi-Search"}
                    icon={isEnabled ? Icon.XMarkCircle : Icon.Checkmark}
                    onAction={toggleMultiSearch}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
