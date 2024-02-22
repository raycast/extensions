import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { callInputSelectSelectOptionService, getInputSelectSelectableOptions } from "./utils";
import { getIcon } from "@components/state/utils";

function InputSelectSetStateMenubarItem(props: { state: State }) {
  const options = getInputSelectSelectableOptions(props.state);
  if (!options || options.length <= 0) {
    return null;
  }
  return (
    <MenuBarSubmenu title="Set State" icon={Icon.Pencil}>
      {options?.map((o) => (
        <MenuBarExtra.Item key={o} title={o} onAction={() => callInputSelectSelectOptionService(props.state, o)} />
      ))}
    </MenuBarSubmenu>
  );
}

export function InputSelectMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} subtitle={s.state} icon={getIcon(s)}>
      <InputSelectSetStateMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
