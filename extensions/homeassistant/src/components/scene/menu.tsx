import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { callSceneActivateService } from "./utils";
import { getIcon } from "@components/state/utils";

function SceneActiveMenubarItem(props: { state: State }) {
  return (
    <MenuBarExtra.Item title="Activate" icon={Icon.Terminal} onAction={() => callSceneActivateService(props.state)} />
  );
}

export function SceneMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} icon={getIcon(s)}>
      <SceneActiveMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
