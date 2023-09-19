import { Icon, Color, Action, ActionPanel } from "@raycast/api";
import { State } from "@lib/haapi";
import { callInputButtonPressService, isEditableInputButton } from "./utils";
import { EntityStandardActionSections } from "@components/entity";

export function InputButtonPressAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isEditableInputButton(s)) {
    return null;
  }
  return (
    <Action
      title="Press"
      onAction={() => callInputButtonPressService(s)}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
    />
  );
}

export function InputButtonActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <InputButtonPressAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
