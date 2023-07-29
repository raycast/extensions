import { MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getFriendlyName } from "../../utils";
import { MenuBarSubmenu } from "../menu";
import { getIcon } from "../state/list";
import { CopyEntityIDToClipboard } from "../state/menu";
import { callInputButtonPressService, isEditableInputButton } from "./utils";

function InputButtonPressMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputButton(s)) {
    return null;
  }
  return <MenuBarExtra.Item title="Turn On" icon="toggle.png" onAction={() => callInputButtonPressService(s)} />;
}

export function InputButtonMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputButton(s)) {
    return null;
  }
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} icon={getIcon(s)}>
      <InputButtonPressMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
