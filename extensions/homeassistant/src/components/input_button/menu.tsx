import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { getIcon } from "@components/state/utils";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { MenuBarExtra } from "@raycast/api";
import { callInputButtonPressService, isEditableInputButton } from "./utils";

function InputButtonPressMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputButton(s)) {
    return null;
  }
  return <MenuBarExtra.Item title="Press" icon="cached.svg" onAction={() => callInputButtonPressService(s)} />;
}

export function InputButtonMenubarItem(props: { state: State }) {
  const s = props.state;
  if (!isEditableInputButton(s)) {
    return null;
  }
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} icon={getIcon(s)}>
      <InputButtonPressMenubarItem state={s} />
      <LastUpdateChangeMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
