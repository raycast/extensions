import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { getIcon, stateChangeSleep } from "@components/state/utils";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Icon, MenuBarExtra, Toast, showToast } from "@raycast/api";
import React from "react";
import {
  callLightBrightnessService,
  getLightBrightnessValues,
  getLightCurrentBrightnessPercentage,
  hasLightBrightnessSupport,
} from "./utils";

function LightBrightnessControl(props: { state: State }) {
  if (!hasLightBrightnessSupport(props.state)) {
    return null;
  }
  const values = getLightBrightnessValues();
  const cb = getLightCurrentBrightnessPercentage(props.state);
  return (
    <MenuBarSubmenu title="Set Brightness" subtitle={cb === undefined ? undefined : `${cb}%`} icon={Icon.Pencil}>
      {values?.map((v) => (
        <MenuBarExtra.Item key={v} title={`${v}%`} onAction={() => callLightBrightnessService(props.state, v)} />
      ))}
    </MenuBarSubmenu>
  );
}

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
  return <MenuBarExtra.Item title="Turn On" onAction={handle} icon={"power.svg"} />;
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
  return <MenuBarExtra.Item title="Turn Off" onAction={handle} icon="power.svg" />;
}

export function LightMenubarItem(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  const friendlyName = getFriendlyName(s);
  const title = () => {
    return friendlyName;
  };
  const currentBrightness = getLightCurrentBrightnessPercentage(s);
  return (
    <MenuBarSubmenu
      key={s.entity_id}
      title={title()}
      subtitle={currentBrightness === undefined ? undefined : `${currentBrightness}%`}
      icon={getIcon(s)}
    >
      <LightTurnOnMenubarItem state={s} />
      <LightTurnOffMenubarItem state={s} />
      <LightBrightnessControl state={s} />
      <LastUpdateChangeMenubarItem state={s} />
      <RUIMenuBarExtra.CopyToClipboard title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
