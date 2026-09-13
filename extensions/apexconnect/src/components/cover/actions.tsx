import { EntityStandardActionSections } from "@components/entity";
import { apex } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";

export function CoverActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <Action
          title="Toggle"
          onAction={async () => await apex.toggleCover(props.state.entity_id)}
          icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Open"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => await apex.openCover(props.state.entity_id)}
          icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}
        />
        <Action
          title="Close"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => await apex.closeCover(props.state.entity_id)}
          icon={{ source: Icon.ChevronDown, tintColor: Color.PrimaryText }}
        />
        <Action
          title="Stop"
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => await apex.stopCover(props.state.entity_id)}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
