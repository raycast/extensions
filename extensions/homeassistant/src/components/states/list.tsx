import { ActionPanel, Color, List, showToast, Image, Toast } from "@raycast/api";
import { State } from "../../haapi";
import { useState } from "react";
import { ha, shouldDisplayEntityID } from "../../common";
import { useHAStates } from "../../hooks";
import { EntityStandardActionSections } from "../entity";
import { MediaPlayerActionPanel } from "../mediaplayer/actions";
import { FanActionPanel } from "../fan/actions";
import { LightActionPanel } from "../light/actions";
import { changeRGBBrightness, RGBtoString } from "../../color";
import { AutomationActionPanel } from "../automation/actions";
import { VacuumActionPanel } from "../vacuum/actions";
import { ScriptActionPanel } from "../script/actions";
import { ButtonActionPanel } from "../button/actions";
import { SceneActionPanel } from "../scene/actions";
import { InputBooleanActionPanel } from "../input_boolean/actions";
import { InputNumberActionPanel } from "../input_number/actions";
import { TimerActionPanel } from "../timer/actions";
import { InputSelectActionPanel } from "../input_select/actions";
import { InputButtonActionPanel } from "../input_button/actions";
import { InputTextActionPanel } from "../input_text/actions";
import { InputDateTimeActionPanel } from "../input_datetime/actions";
import { PersonActionPanel } from "../persons/actions";
import { getStateTooltip } from "../../utils";
import { getMediaPlayerTitleAndArtist } from "../mediaplayer/utils";
import { weatherConditionToIcon } from "../weather/utils";
import { CameraActionPanel } from "../camera/actions";
import { UpdateActionPanel } from "../update/actions";
import { getLightCurrentBrightnessPercentage, getLightRGBFromState } from "../light/utils";
import { ZoneActionPanel } from "../zone/actions";
import { SwitchActionPanel } from "../switches/actions";
import { WeatherActionPanel } from "../weather/actions";
import { ClimateActionPanel } from "../climate/actions";
import { CoverActionPanel } from "../cover/actions";
import { useStateSearch } from "./hooks";

export const PrimaryIconColor = Color.Blue;
const UnavailableColor = "#bdbdbd";
const Unavailable = "unavailable";

const lightColor: Record<string, Color.ColorLike> = {
  on: Color.Yellow,
  off: Color.Blue,
};

const coverStateIconSource: Record<string, string> = {
  opening: "cover-up.png",
  closing: "cover-down.png",
  open: "cover-open.png",
  closed: "cover-close.png",
};

const deviceClassIconSource: Record<string, string> = {
  temperature: "temperature.png",
  power: "power.png",
  update: "update.png",
  connectivity: "connectivity.png",
  carbon_dioxide: "carbon-dioxide.png",
  pressure: "pressure.png",
  humidity: "humidity.png",
};

const batterLevelIcons: string[] = [
  "battery-00.png",
  "battery-10.png",
  "battery-20.png",
  "battery-30.png",
  "battery-40.png",
  "battery-50.png",
  "battery-60.png",
  "battery-70.png",
  "battery-80.png",
  "battery-90.png",
  "battery-100.png",
];

/**
 * @param state
 * @returns Nice format of state of the given object. If no device class found state will be given back
 */
export function getDeviceClassState(state: State): string {
  const dc = state.attributes.device_class;
  if (dc) {
    if (dc === "problem") {
      switch (state.state) {
        case "on": {
          return "Detected";
        }
        case "off": {
          return "OK";
        }
      }
    } else if (dc === "motion") {
      switch (state.state) {
        case "on": {
          return "Detected";
        }
        case "off": {
          return "Normal";
        }
      }
    } else if (dc === "plug") {
      switch (state.state) {
        case "on": {
          return "Plugged";
        }
        case "off": {
          return "Unplugged";
        }
      }
    } else if (dc === "update") {
      switch (state.state) {
        case "on": {
          return "Update Available";
        }
        case "off": {
          return "Up To Date";
        }
      }
    } else if (dc === "door") {
      switch (state.state) {
        case "on": {
          return "Open";
        }
        case "off": {
          return "Closed";
        }
      }
    } else if (dc === "window") {
      switch (state.state) {
        case "on": {
          return "Open";
        }
        case "off": {
          return "Closed";
        }
      }
    }
  }
  return state.state;
}

function getDeviceClassIcon(state: State): Image.ImageLike | undefined {
  if (state.attributes.device_class) {
    const dc = state.attributes.device_class;
    if (dc === "battery") {
      const v = parseFloat(state.state);
      let src = "battery-100.png";
      if (!isNaN(v)) {
        const level = Math.floor(v / 10);
        const levelIcon = batterLevelIcons[level];
        if (levelIcon) {
          src = levelIcon;
        }
      }
      let tintColor = PrimaryIconColor;
      if (v <= 20) {
        tintColor = Color.Red;
      } else if (v <= 30) {
        tintColor = Color.Yellow;
      }
      return { source: src, tintColor: tintColor };
    } else if (dc === "motion") {
      const source = state.state === "on" ? "run.png" : "walk.png";
      const color =
        state.state === "unavailable" ? UnavailableColor : state.state === "on" ? Color.Yellow : PrimaryIconColor;
      return { source: source, tintColor: color };
    } else if (dc === "temperature") {
      return { source: "temperature.png", tintColor: PrimaryIconColor };
    } else if (dc === "plug") {
      const source = state.state === "on" ? "power-plug.png" : "power-plug-off.png";
      const color = state.state === "unavailable" ? UnavailableColor : PrimaryIconColor;
      return { source: source, tintColor: color };
    } else if (dc === "door") {
      const source = state.state === "on" ? "door-open.png" : "door-closed.png";
      const color =
        state.state === "unavailable" ? UnavailableColor : state.state === "on" ? Color.Yellow : PrimaryIconColor;
      return { source: source, tintColor: color };
    } else if (dc === "window") {
      const source = state.state === "on" ? "cover-open.png" : "cover-close.png"; // window icons are the same as cover icons in HA
      const color =
        state.state === "unavailable" ? UnavailableColor : state.state === "on" ? Color.Yellow : PrimaryIconColor;
      return { source: source, tintColor: color };
    } else if (dc === "power_factor") {
      const color = state.state === Unavailable ? UnavailableColor : PrimaryIconColor;
      return { source: "angle-acute.png", tintColor: color };
    } else if (dc === "energy") {
      const color = state.state === Unavailable ? UnavailableColor : PrimaryIconColor;
      return { source: "flash.png", tintColor: color };
    }
    const src = deviceClassIconSource[dc] || "entity.png";
    return { source: src, tintColor: PrimaryIconColor };
  } else {
    return undefined;
  }
}

export function getStateValue(state: State): string | undefined {
  if (state.entity_id.startsWith("light") && state.state === "on") {
    const brightnessPercentage = getLightCurrentBrightnessPercentage(state);
    if (brightnessPercentage !== undefined) {
      return `${Math.round(brightnessPercentage)}%`;
    }
  } else if (state.entity_id.startsWith("fan")) {
    // Speed as a percentage
    const p = state.attributes.percentage || undefined;
    if (!isNaN(p)) {
      return `${p}%`;
    }
  } else if (state.entity_id.startsWith("sensor")) {
    const unit = (state.attributes.unit_of_measurement as string) || undefined;
    const sl = state.state?.toLocaleLowerCase();
    if (unit && sl && sl !== "unknown" && sl !== "unavailable") {
      return `${state.state} ${unit}`;
    }
  } else if (state.entity_id.startsWith("media_player")) {
    const v = state.attributes.volume_level as number;
    if (v && typeof v === "number" && !Number.isNaN(v)) {
      const vr = Math.round(v * 100);
      return `🔉 ${vr}% | ${state.state}`;
    }
  } else if (state.entity_id.startsWith("binary_sensor")) {
    return getDeviceClassState(state);
  } else if (state.entity_id.startsWith("input_button")) {
    return new Date(state.state).toISOString().replace("T", " ").replace("Z", "");
  } else if (state.entity_id.startsWith("update")) {
    if (state.attributes.in_progress === true) {
      return "in progress 🔄";
    }
    const iv = state.attributes.installed_version;
    const lv = state.attributes.latest_version;
    if (state.state === "on" && lv) {
      if (iv) {
        return `${iv} => ${lv}`;
      }
      return lv;
    } else if (state.state === "off") {
      return "✅";
    }
    return state.state;
  }
  return state.state;
}

function getLightIconSource(state: State): string {
  const attr = state.attributes;
  return attr.icon && attr.icon === "mdi:lightbulb-group" ? "lightbulb-group.png" : "lightbulb.png";
}

function getLightTintColor(state: State): Color.ColorLike {
  const sl = state.state.toLocaleLowerCase();
  if (sl === "unavailable") {
    return UnavailableColor;
  }
  const rgb = getLightRGBFromState(state);
  if (rgb) {
    return { light: RGBtoString(changeRGBBrightness(rgb, 56.6)), dark: RGBtoString(rgb) };
  }
  return lightColor[sl] || PrimaryIconColor;
}

export function getIcon(state: State): Image.ImageLike | undefined {
  const e = state.entity_id;
  if (e.startsWith("light")) {
    const color = getLightTintColor(state);
    const source = getLightIconSource(state);
    return { source: source, tintColor: color };
  } else if (e.startsWith("person")) {
    const ep = state.attributes.entity_picture;
    if (ep && ep.startsWith("/")) {
      return { source: ha.urlJoin(ep), mask: Image.Mask.Circle };
    }
    return { source: "person.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("device_tracker")) {
    let source = "entity.png";
    let color: Color.ColorLike = PrimaryIconColor;
    switch (state.attributes.source_type) {
      case "gps":
        {
          source = "person.png";
        }
        break;
      case "router":
        {
          if (state.state === "home") {
            source = "lan-connect.svg";
          } else {
            source = "lan-disconnect.svg";
          }
        }
        break;
      default:
        {
          source = "lan-disconnect.svg";
        }
        break;
    }
    switch (state.state) {
      case "home":
        {
          color = Color.Yellow;
        }
        break;
      case "not_home":
        {
          color = PrimaryIconColor;
        }
        break;
      default:
        {
          color = UnavailableColor;
        }
        break;
    }
    return { source: source, tintColor: color };
  } else if (e.startsWith("update")) {
    const ep = (state.attributes.entity_picture as string) || undefined;
    if (ep) {
      return ep.startsWith("/") ? ha.urlJoin(ep) : ep;
    }
    return { source: "update.png", tintColor: state.state === "on" ? Color.Yellow : PrimaryIconColor };
  } else if (e.startsWith("cover")) {
    const source = coverStateIconSource[`${state.state}`] || coverStateIconSource.open;
    return { source: source, tintColor: PrimaryIconColor };
  } else if (e.startsWith("automation")) {
    return { source: "automation.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("climate")) {
    return { source: "climate.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("media_player")) {
    return { source: "mediaplayer.png", tintColor: PrimaryIconColor };
  } else if (e === "sun.sun") {
    const sl = state.state.toLocaleLowerCase();
    const source = sl === "below_horizon" ? "weather-night.png" : "white-balance-sunny.png";
    return { source: source, tintColor: PrimaryIconColor };
  } else if (e.startsWith("input_number")) {
    return { source: "ray-vertex.png", tintColor: PrimaryIconColor };
  } else if (e === "binary_sensor.rpi_power_status") {
    return { source: "raspberry-pi.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("water_heater")) {
    return { source: "temperature.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("camera")) {
    return { source: "video.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("vacuum")) {
    const color = state.state === "cleaning" ? Color.Yellow : PrimaryIconColor;
    return { source: "robot-vacuum.png", tintColor: color };
  } else if (e.startsWith("script")) {
    const color = state.state === "on" ? Color.Yellow : PrimaryIconColor;
    return { source: "play.png", tintColor: color };
  } else if (e.startsWith("scene")) {
    return { source: "palette.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("switch")) {
    const wallSwitch = state.state === "on" ? { source: "on.png" } : { source: "off.png", tintColor: PrimaryIconColor };
    return wallSwitch;
  } else if (e.startsWith("input_boolean")) {
    const wallSwitch = state.state === "on" ? { source: "on.png" } : { source: "off.png", tintColor: PrimaryIconColor };
    return wallSwitch;
  } else if (e.startsWith("timer")) {
    const color = state.state === "active" ? Color.Yellow : PrimaryIconColor;
    return { source: "av-timer.png", tintColor: color };
  } else if (e.startsWith("input_select")) {
    return { source: "format-list-bulleted.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("input_button")) {
    return { source: "gesture-tap-button.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("input_text")) {
    return { source: "form-textbox.png", tintColor: PrimaryIconColor };
  } else if (e.startsWith("input_datetime")) {
    let source = "calendar-clock.png";
    const hasDate: boolean = state.attributes.has_date || false;
    const hasTime: boolean = state.attributes.has_time || false;
    if (hasDate && hasTime) {
      source = "calendar-clock.png";
    } else if (hasDate) {
      source = "calendar.png";
    } else if (hasTime) {
      source = "clock-time-four.png";
    }
    return { source: source, tintColor: PrimaryIconColor };
  } else if (e.startsWith("weather")) {
    return { source: weatherConditionToIcon(state.state) };
  } else if (e.startsWith("fan")) {
    let source = "fan.png";
    let tintColor: Color.ColorLike = PrimaryIconColor;

    switch (state.state.toLocaleLowerCase()) {
      case "on":
        tintColor = Color.Yellow;
        break;
      case "off":
        source = "fan-off.png";
        break;
      case "unavailable":
        tintColor = UnavailableColor;
        break;
    }

    return { source: source, tintColor: tintColor };
  } else if (e.startsWith("zone")) {
    return { source: "home.svg", tintColor: PrimaryIconColor };
  } else {
    const di = getDeviceClassIcon(state);
    return di ? di : { source: "entity.png", tintColor: PrimaryIconColor };
  }
}

export function StatesList(props: { domain: string; deviceClass?: string | undefined }): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, props.domain, props.deviceClass, allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot search Home Assistant states.",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {states?.map((state) => <StateListItem key={state.entity_id} state={state} />)}
    </List>
  );
}

export function StateListItem(props: { state: State }): JSX.Element {
  const state = props.state;
  const extraTitle = (state: State): string => {
    try {
      const e = state.entity_id;
      if (e.startsWith("cover") && "current_position" in state.attributes) {
        const p = state.attributes.current_position;
        if (p > 0 && p < 100) {
          return `${p}% | `;
        }
      } else if (e.startsWith("climate") && "current_temperature" in state.attributes) {
        return `${state.attributes.current_temperature} | `;
      }
    } catch (e) {
      // ignore
    }
    return "";
  };

  let icon: Image.ImageLike | undefined;
  const subtitle = (state: State): string | undefined => {
    let extra: string | undefined;
    if (state.entity_id.startsWith("media_player")) {
      const parts = [];
      const song = getMediaPlayerTitleAndArtist(state);
      if (song) {
        parts.push(song);
      }
      const channel = state.attributes.media_channel;
      if (channel) {
        parts.push(channel);
      }
      extra = parts.join(" | ");

      const ep = state.attributes.entity_picture;
      if (ep) {
        icon = ha.urlJoin(ep);
      }
    }
    if (shouldDisplayEntityID()) {
      return extra;
    }
    if (extra) {
      return `${state.entity_id} | ${extra}`;
    }
    return state.entity_id;
  };

  return (
    <List.Item
      key={state.entity_id}
      title={state.attributes.friendly_name || state.entity_id}
      subtitle={subtitle(state)}
      actions={<StateActionPanel state={state} />}
      icon={icon || getIcon(state)}
      accessories={[
        {
          text: extraTitle(state) + getStateValue(state),
          tooltip: getStateTooltip(state),
        },
      ]}
    />
  );
}

export function StateActionPanel(props: { state: State }): JSX.Element {
  const state = props.state;
  const domain = props.state.entity_id.split(".")[0];

  switch (domain) {
    case "cover": {
      return <CoverActionPanel state={state} />;
    }
    case "fan": {
      return <FanActionPanel state={state} />;
    }
    case "light": {
      return <LightActionPanel state={state} />;
    }
    case "media_player": {
      return <MediaPlayerActionPanel state={state} />;
    }
    case "climate": {
      return <ClimateActionPanel state={state} />;
    }
    case "automation": {
      return <AutomationActionPanel state={state} />;
    }
    case "vacuum": {
      return <VacuumActionPanel state={state} />;
    }
    case "camera": {
      return <CameraActionPanel state={state} />;
    }
    case "script": {
      return <ScriptActionPanel state={state} />;
    }
    case "button": {
      return <ButtonActionPanel state={state} />;
    }
    case "scene": {
      return <SceneActionPanel state={state} />;
    }
    case "switch": {
      return <SwitchActionPanel state={state} />;
    }
    case "input_boolean": {
      return <InputBooleanActionPanel state={state} />;
    }
    case "input_number": {
      return <InputNumberActionPanel state={state} />;
    }
    case "timer": {
      return <TimerActionPanel state={state} />;
    }
    case "input_select": {
      return <InputSelectActionPanel state={state} />;
    }
    case "input_button": {
      return <InputButtonActionPanel state={state} />;
    }
    case "input_text": {
      return <InputTextActionPanel state={state} />;
    }
    case "input_datetime": {
      return <InputDateTimeActionPanel state={state} />;
    }
    case "update": {
      return <UpdateActionPanel state={state} />;
    }
    case "zone": {
      return <ZoneActionPanel state={state} />;
    }
    case "person": {
      return <PersonActionPanel state={state} />;
    }
    case "weather": {
      return <WeatherActionPanel state={state} />;
    }
    default: {
      return (
        <ActionPanel>
          <EntityStandardActionSections state={state} />
        </ActionPanel>
      );
    }
  }
}
