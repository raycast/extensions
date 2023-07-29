import { Icon, Color, Action } from "@raycast/api";
import { ha } from "../../common";
import { State } from "../../haapi";
import { callScriptRunService } from "./utils";

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
    const url = ha.urlJoin(`config/script/edit/${editId}`);
    return (
      <Action.OpenInBrowser url={url} title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} />
    );
  }
  return null;
}

export function ScriptDebugInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("script")) {
    const url = ha.urlJoin(`config/script/trace/${s.entity_id}`);
    return <Action.OpenInBrowser url={url} title="Debug" icon={Icon.Bug} shortcut={{ modifiers: ["cmd"], key: "d" }} />;
  }
  return null;
}
