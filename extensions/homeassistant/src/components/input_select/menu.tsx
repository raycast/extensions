import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getFriendlyName } from "../../utils";
import { MenuBarSubmenu } from "../menu";
import { getIcon } from "../states/list";
import { CopyEntityIDToClipboard } from "../states/menu";
import { callInputSelectSelectOptionService, getInputSelectSelectableOptions } from "./utils";

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
