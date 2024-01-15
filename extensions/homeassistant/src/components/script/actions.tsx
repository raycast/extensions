import { Icon, Color, Action, ActionPanel } from "@raycast/api";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { callScriptRunService } from "./utils";
import { EntityStandardActionSections } from "@components/entity";

export function ScriptRunAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("script")) {
    return null;
  }
  return (
    <Action
      title="Run"
      onAction={() => callScriptRunService(s)}
      icon={{ source: Icon.Binoculars, tintColor: Color.PrimaryText }}
    />
  );
}

export function ScriptEditInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("script")) {
    const editId = s.entity_id.substring("script.".length);
    const url = ha.navigateUrl(`config/script/edit/${editId}`);
    return (
      <Action.OpenInBrowser url={url} title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} />
    );
  }
  return null;
}

export function ScriptDebugInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("script")) {
    const url = ha.navigateUrl(`config/script/trace/${s.entity_id}`);
    return <Action.OpenInBrowser url={url} title="Debug" icon={Icon.Bug} shortcut={{ modifiers: ["cmd"], key: "d" }} />;
  }
  return null;
}

export function ScriptActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <ScriptRunAction state={state} />
        <ScriptEditInBrowserAction state={state} />
        <ScriptDebugInBrowserAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
