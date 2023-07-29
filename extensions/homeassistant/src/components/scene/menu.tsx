import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getFriendlyName } from "../../utils";
import { MenuBarSubmenu } from "../menu";
import { CopyEntityIDToClipboard } from "../state/menu";
import { callSceneActivateService } from "./utils";
import { getIcon } from "../state/utils";

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
