import { CopyToClipboardMenubarItem, MenuBarSubmenu } from "../menu";
import { getErrorMessage, getFriendlyName } from "../../utils";
import { State } from "../../haapi";
import { getIcon } from "../states";
import { ha } from "../../common";
import { MenuBarExtra, Toast, showToast } from "@raycast/api";
import { stateChangeSleep } from "../states/utils";

function LightTurnOnMenubarItem(props: { state: State }) {
  if (props.state.state !== "off") {
    return null;
  }
  const handle = async () => {
    try {
      await ha.turnOnLight(props.state.entity_id);
      await stateChangeSleep();
    } catch (error) {
      console.log(error);
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <MenuBarExtra.Item title="Turn On" onAction={handle} icon={"power-btn.png"} />;
}

function LightTurnOffMenubarItem(props: { state: State }) {
  if (props.state.state !== "on") {
    return null;
  }
  const handle = async () => {
    try {
      await ha.turnOffLight(props.state.entity_id);
      await stateChangeSleep();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <MenuBarExtra.Item title="Turn Off" onAction={handle} icon="power-btn.png" />;
}

export function LightMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const friendlyName = getFriendlyName(s);
  const title = () => {
    return friendlyName;
  };
  return (
    <MenuBarSubmenu key={s.entity_id} title={title()} icon={getIcon(s)}>
      <LightTurnOnMenubarItem state={s} />
      <LightTurnOffMenubarItem state={s} />
      <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
