import { getIcon } from "@components/state/utils";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { MenuBarExtra, Toast, showToast } from "@raycast/api";
import { capitalize } from "lodash-es";
import { CopyToClipboardMenubarItem, MenuBarSubmenu } from "../menu";

function SwitchToggleItem(props: { state: State }) {
  const handle = async () => {
    try {
      await ha.toggleSwitch(props.state.entity_id);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <MenuBarExtra.Item title="Toggle" onAction={handle} icon={"toggle.png"} />;
}

function SwitchTurnOnItem(props: { state: State }) {
  const handle = async () => {
    try {
      await ha.turnOnSwitch(props.state.entity_id);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  if (props.state.state !== "off") {
    return null;
  }
  return <MenuBarExtra.Item title="Turn On" onAction={handle} icon={"power-btn.png"} />;
}

function SwitchTurnOffItem(props: { state: State }) {
  const handle = async () => {
    try {
      await ha.turnOnSwitch(props.state.entity_id);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  if (props.state.state !== "on") {
    return null;
  }
  return <MenuBarExtra.Item title="Turn Off" onAction={handle} icon={"power-btn.png"} />;
}

export function SwitchMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const friendlyName = getFriendlyName(s);
  const title = () => {
    return friendlyName;
  };
  return (
    <MenuBarSubmenu key={s.entity_id} title={title()} subtitle={capitalize(s.state)} icon={getIcon(s)}>
      <SwitchToggleItem state={s} />
      <SwitchTurnOnItem state={s} />
      <SwitchTurnOffItem state={s} />
      <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
