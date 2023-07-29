import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getFriendlyName } from "../../utils";
import { MenuBarSubmenu } from "../menu";
import { CopyEntityIDToClipboard } from "../states/menu";
import { ha } from "../../common";
import { getIcon } from "../states/utils";

function ButtonPressMenubarItem(props: { state: State }) {
  const handle = async () => {
    await ha.callService("button", "press", { entity_id: props.state.entity_id });
  };
  return <MenuBarExtra.Item title="Press" icon={Icon.Terminal} onAction={handle} />;
}

export function ButtonMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu key={s.entity_id} title={getFriendlyName(s)} icon={getIcon(s)}>
      <ButtonPressMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
