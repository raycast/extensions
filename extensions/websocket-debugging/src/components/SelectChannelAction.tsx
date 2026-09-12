import { Action, Icon } from "@raycast/api";
import { SelectChannelForm } from "./index";

function SelectChannelAction(props: { defaultChannel?: string; onCreate: (title: string) => void }) {
  return (
    <Action.Push
      icon={Icon.ArrowDownCircle}
      title="Select Channel"
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      target={<SelectChannelForm defaultChannel={props.defaultChannel} onCreate={props.onCreate} />}
    />
  );
}

export default SelectChannelAction;
