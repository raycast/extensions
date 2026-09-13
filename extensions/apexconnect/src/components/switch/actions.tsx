import { EntityStandardActionSections } from "@components/entity";
import { apex } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color } from "@raycast/api";

export function SwitchActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <Action
          title="Toggle"
          onAction={async () => await apex.toggleSwitch(props.state.entity_id)}
          icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn On"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => await apex.turnOnSwitch(props.state.entity_id)}
          icon={{ source: "power-btn.png", tintColor: Color.Green }}
        />
        <Action
          title="Turn Off"
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => await apex.turnOffSwitch(props.state.entity_id)}
          icon={{ source: "power-btn.png", tintColor: Color.Red }}
        />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
