import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color } from "@raycast/api";

export function SwitchActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <Action
          title="Toggle"
          onAction={async () => await ha.toggleSwitch(props.state.entity_id)}
          icon={{ source: "cached.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn On"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => await ha.turnOnSwitch(props.state.entity_id)}
          icon={{ source: "power-on.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn Off"
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => await ha.turnOffSwitch(props.state.entity_id)}
          icon={{ source: "power-off.svg", tintColor: Color.PrimaryText }}
        />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
