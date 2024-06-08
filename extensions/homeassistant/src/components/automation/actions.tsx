import { HAOpenUrlInAction } from "@components/actions";
import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { callAutomationTriggerService, callAutomationTurnOffService, callAutomationTurnOnService } from "./utils";

export function AutomationTriggerAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("automation") || s.state === "off") {
    return null;
  }
  return (
    <Action
      title="Trigger"
      onAction={() => callAutomationTriggerService(s)}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
    />
  );
}

export function AutomationTurnOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("automation") && s.state === "off") {
    return (
      <Action
        title="Turn On"
        onAction={() => callAutomationTurnOnService(s)}
        icon={{ source: "power-btn.png", tintColor: Color.Green }}
      />
    );
  }
  return null;
}

export function AutomationTurnOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("automation") && s.state === "on") {
    return (
      <Action
        title="Turn Off"
        onAction={() => callAutomationTurnOffService(s)}
        icon={{ source: "power-btn.png", tintColor: Color.Red }}
      />
    );
  }
  return null;
}

export function AutomationEditInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("automation")) {
    const id = props.state.attributes.id as number | undefined;
    if (id !== undefined) {
      const url = ha.navigateUrl(`config/automation/edit/${id}`);
      return (
        <HAOpenUrlInAction url={url} action="Edit In" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} />
      );
    }
  }
  return null;
}

export function AutomationDebugInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("automation")) {
    const id = props.state.attributes.id as number | undefined;
    if (id !== undefined) {
      const url = ha.navigateUrl(`config/automation/trace/${id}`);
      return <HAOpenUrlInAction url={url} title="Debug" icon={Icon.Bug} shortcut={{ modifiers: ["cmd"], key: "d" }} />;
    }
  }
  return null;
}

export function AutomationActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <AutomationTurnOnAction state={state} />
        <AutomationTurnOffAction state={state} />
        <AutomationTriggerAction state={state} />
        <AutomationEditInBrowserAction state={state} />
        <AutomationDebugInBrowserAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
