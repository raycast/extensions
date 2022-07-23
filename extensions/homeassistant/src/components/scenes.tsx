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
