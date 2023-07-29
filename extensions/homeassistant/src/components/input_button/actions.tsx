import { Icon, Color, Action } from "@raycast/api";
import { State } from "../../haapi";
import { callInputButtonPressService, isEditableInputButton } from "./utils";

export function InputButtonPressAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!isEditableInputButton(s)) {
    return null;
  }
  return (
    <Action
      title="Press"
      onAction={() => callInputButtonPressService(s)}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
    />
  );
}
