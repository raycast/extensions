import { Icon, Color, Action } from "@raycast/api";
import { State } from "../../haapi";
import { InputDateTimeForm } from "./form";

export function InputDateTimeSetValueAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("input_datetime")) {
    return null;
  }
  if (s.state === "unavailable") {
    return null;
  }
  const hasDate: boolean = s.attributes.has_date || false;
  const hasTime: boolean = s.attributes.has_time || false;
  let title = "";
  if (hasDate && hasTime) {
    title = "Set Date and Time";
  } else if (hasDate) {
    title = "Set Date";
  } else if (hasTime) {
    title = "Set Time";
  } else {
    return null;
  }
  return (
    <Action.Push
      title={title}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<InputDateTimeForm state={s} hasDate={hasDate} hasTime={hasTime} />}
    />
  );
}
