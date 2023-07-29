import { Icon, Color, Action } from "@raycast/api";
import { State } from "../../haapi";
import { InputTextForm } from "./form";

export function InputTextSetValueAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_text")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  return (
    <Action.Push
      title="Set Text"
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<InputTextForm state={s} />}
    />
  );
}
