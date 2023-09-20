import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { MenuBarSubmenu } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { callScriptRunService } from "./utils";
import { getIcon } from "@components/state/utils";

function ScriptRunMenubarItem(props: { state: State }) {
  return <MenuBarExtra.Item title="Run" icon={Icon.Terminal} onAction={() => callScriptRunService(props.state)} />;
}

export function ScriptMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} icon={getIcon(s)}>
      <ScriptRunMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
