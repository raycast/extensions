import { ActionPanel, Icon, Color } from "@raycast/api";
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
  return (
    <ActionPanel.Item title="Run" onAction={handle} icon={{ source: Icon.Binoculars, tintColor: Color.PrimaryText }} />
  );
}
