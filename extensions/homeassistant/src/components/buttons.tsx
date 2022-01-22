import { ActionPanel, Icon, Color } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function ButtonPressAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("button")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("button", "press", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item title="Press" onAction={handle} icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }} />
  );
}
