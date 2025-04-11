import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { getIcon } from "@components/state/utils";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { Icon, MenuBarExtra } from "@raycast/api";

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
      <LastUpdateChangeMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
