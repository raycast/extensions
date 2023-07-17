import { Icon, Color, Action } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function SceneActivateAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("scene")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("scene", "turn_on", { entity_id: s.entity_id });
  };
  return <Action title="Activate" onAction={handle} icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }} />;
}

export function SceneEditInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("scene")) {
    const id = props.state.attributes.id as number | undefined;
    if (id !== undefined) {
      const url = ha.urlJoin(`config/scene/edit/${id}`);
      return (
        <Action.OpenInBrowser url={url} title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} />
      );
    }
  }
  return null;
}
