import { Icon, Color, Action } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function ScriptRunAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("script")) {
    return null;
  }
  const name = s.entity_id.substring(7);
  console.log(name);
  const handle = async () => {
    await ha.callService("script", "turn_on", { entity_id: s.entity_id });
  };
  return <Action title="Run" onAction={handle} icon={{ source: Icon.Binoculars, tintColor: Color.PrimaryText }} />;
}

export function ScriptEditInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("script")) {
    const url = ha.urlJoin(`config/script/edit/${s.entity_id}`);
    return (
      <Action.OpenInBrowser url={url} title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ["opt"], key: "e" }} />
    );
  }
  return null;
}

export function ScriptDebugInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("script")) {
    const url = ha.urlJoin(`config/script/trace/${s.entity_id}`);
    return <Action.OpenInBrowser url={url} title="Debug" icon={Icon.Bug} shortcut={{ modifiers: ["opt"], key: "d" }} />;
  }
  return null;
}
