import { ActionPanel, Action, Color } from "@raycast/api";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { EntityStandardActionSections } from "@components/entity";

export function SwitchActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <Action
          title="Toggle"
          onAction={async () => await ha.toggleSwitch(props.state.entity_id)}
          icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Turn On"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => await ha.turnOnSwitch(props.state.entity_id)}
          icon={{ source: "power-btn.png", tintColor: Color.Green }}
        />
        <Action
          title="Turn Off"
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => await ha.turnOffSwitch(props.state.entity_id)}
          icon={{ source: "power-btn.png", tintColor: Color.Red }}
        />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
