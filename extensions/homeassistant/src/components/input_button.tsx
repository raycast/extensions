import { Icon, Color, Action } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function InputButtonPressAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_button")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  const handle = async () => {
    await ha.callService("input_button", "press", { entity_id: s.entity_id });
  };
  return <Action title="Press" onAction={handle} icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }} />;
}
