import { AutomationMenubarItem } from "@components/automation/menu";
import { ButtonMenubarItem } from "@components/button/menu";
import { CameraMenubarItem } from "@components/camera/menu";
import { CoverMenubarItem } from "@components/cover/menu";
import { useHAStates } from "@components/hooks";
import { InputBooleanMenubarItem } from "@components/input_boolean/menu";
import { InputButtonMenubarItem } from "@components/input_button/menu";
import { InputSelectMenubarItem } from "@components/input_select/menu";
import { LightMenubarItem } from "@components/light/menu";
import { MediaPlayerMenubarItem } from "@components/mediaplayer/menu";
import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { PersonMenubarItem } from "@components/person/menu";
import { SceneMenubarItem } from "@components/scene/menu";
import { ScriptMenubarItem } from "@components/script/menu";
import { SwitchMenubarItem } from "@components/switch/menu";
import { TimerMenubarItem } from "@components/timer/menu";
import { VacuumMenubarItem } from "@components/vacuum/menu";
import { WeatherMenubarItem } from "@components/weather/menu";
import { State } from "@lib/haapi";
import { ensureShort, getErrorMessage, getFriendlyName } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import React from "react";
import { getIcon, getStateValue } from "./utils";

export function CopyEntityIDToClipboard(props: { state: State }) {
  const s = props.state;
  return <RUIMenuBarExtra.CopyToClipboard title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />;
}

export function CopyEntityStateToClipboardMenubarItem(props: { state: State }) {
  const s = props.state;
  return <RUIMenuBarExtra.CopyToClipboard title="Copy Entity State" content={s.state} tooltip={s.state} />;
}

export function StateMenubarItem(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  const e = s.entity_id;
  const domain = e.split(".")[0];
  switch (domain) {
    case "media_player": {
      return <MediaPlayerMenubarItem state={s} />;
    }
    case "cover": {
      return <CoverMenubarItem state={s} />;
    }
    case "person": {
      return <PersonMenubarItem state={s} />;
    }
    case "switch": {
      return <SwitchMenubarItem state={s} />;
    }
    case "light": {
      return <LightMenubarItem state={s} />;
    }
    case "weather": {
      return <WeatherMenubarItem state={s} />;
    }
    case "camera": {
      return <CameraMenubarItem state={s} />;
    }
    case "button": {
      return <ButtonMenubarItem state={s} />;
    }
    case "input_boolean": {
      return <InputBooleanMenubarItem state={s} />;
    }
    case "input_button": {
      return <InputButtonMenubarItem state={s} />;
    }
    case "input_select": {
      return <InputSelectMenubarItem state={s} />;
    }
    case "script": {
      return <ScriptMenubarItem state={s} />;
    }
    case "scene": {
      return <SceneMenubarItem state={s} />;
    }
    case "timer": {
      return <TimerMenubarItem state={s} />;
    }
    case "vacuum": {
      return <VacuumMenubarItem state={s} />;
    }
    case "automation": {
      return <AutomationMenubarItem state={s} />;
    }
  }
  return (
    <MenuBarSubmenu
      key={s.entity_id}
      title={getFriendlyName(s)}
      subtitle={ensureShort(getStateValue(s))}
      icon={getIcon(s)}
    >
      <LastUpdateChangeMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
      <CopyEntityStateToClipboardMenubarItem state={s} />
    </MenuBarSubmenu>
  );
}

export function MenuBarExtraEntity(props: { state: State | undefined; isLoading?: boolean | undefined }) {
  const s = props.state;
  const stateValue = (state: State | undefined) => {
    if (!state) {
      return undefined;
    }
    const e = state.entity_id;
    if (e.startsWith("sensor.")) {
      return getStateValue(state);
    }
    return undefined;
  };
  return (
    <MenuBarExtra
      title={stateValue(s)}
      icon={s ? getIcon(s) : "shape.svg"}
      tooltip={s ? getFriendlyName(s) : undefined}
      isLoading={props.isLoading}
    >
      <RUIMenuBarExtra.ConfigureCommand />
    </MenuBarExtra>
  );
}

function getEntityIDfromPreferences() {
  const prefs = getPreferenceValues();
  const result = prefs.entity as string | undefined;
  return result ?? "";
}

export default function SingleEntityMenuBarExtra() {
  const { states, error, isLoading } = useHAStates();
  if (error) {
    return <MenuBarExtra title="?" icon={Icon.Warning} tooltip={getErrorMessage(error)} />;
  }
  const entityID = getEntityIDfromPreferences();
  const entity = states?.find((state) => state.entity_id === entityID);
  return <MenuBarExtraEntity state={entity} isLoading={isLoading} />;
}
