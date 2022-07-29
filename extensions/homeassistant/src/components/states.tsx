import { ActionPanel, Color, Icon, List, popToRoot, showToast, Action, Image, Toast } from "@raycast/api";
import { State } from "../haapi";
import { useState, useEffect } from "react";
import { range } from "lodash-es";
import { ha, shouldDisplayEntityID } from "../common";
import { useHAStates } from "../hooks";
import {
  CopyEntityIDAction,
  CopyStateValueAction,
  OpenEntityHistoryAction,
  OpenEntityLogbookAction,
  ShowAttributesAction,
} from "./entity";
import {
  SelectVolumeAction,
  SelectSourceAction,
  getMediaPlayerTitleAndArtist,
  CopyTrackToClipboard,
  MediaPlayerTurnOnAction,
  MediaPlayerTurnOffAction,
} from "./mediaplayer";
import { FanSpeedControlAction, FanSpeedUpAction, FanSpeedDownAction } from "./fan";
import {
  BrightnessControlAction,
  BrightnessDownAction,
  BrightnessUpAction,
  ColorTempControlAction,
  ColorTempControlDownAction,
  ColorTempControlUpAction,
  ColorRgbControlAction,
  getLightRGBFromState,
} from "./light";
import { changeRGBBrightness, RGBtoString } from "../color";
import { AutomationTriggerAction, AutomationTurnOffAction, AutomationTurnOnAction } from "./automation";
import {
  VacuumLocateAction,
  VacuumPauseAction,
  VacuumReturnToBaseAction,
  VacuumStartAction,
  VacuumStopAction,
  VacuumTurnOffAction,
  VacuumTurnOnAction,
} from "./vacuum";
import { CameraShowImage, CameraTurnOffAction, CameraTurnOnAction } from "./cameras";
import { ScriptRunAction } from "./scripts";
import { ButtonPressAction } from "./buttons";
import { SceneActivateAction } from "./scenes";
import { ensureCleanAccessories } from "../utils";
import { InputBooleanOffAction, InputBooleanOnAction, InputBooleanToggleAction } from "./input_boolean";
import { InputNumberDecrementAction, InputNumberIncrementAction } from "./input_number";
import { TimerCancelAction, TimerPauseAction, TimerStartAction } from "./timer";
import { InputSelectOptionSelectAction } from "./input_select";
import { InputButtonPressAction } from "./input_button";
import { InputTextSetValueAction } from "./input_text";
import { InputDateTimeSetValueAction } from "./input_datetime";
import { UpdateInstallAction, UpdateOpenInBrowser, UpdateShowChangelog, UpdateSkipVersionAction } from "./updates";
import { ShowWeatherAction, weatherConditionToIcon, weatherStatusToIcon } from "./weather";

const PrimaryIconColor = Color.Blue;
const UnavailableColor = "#bdbdbd";

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
    }
    const src = deviceClassIconSource[dc] || "entity.png";
    return { source: src, tintColor: PrimaryIconColor };
  } else {
    return undefined;
  }
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

function getIcon(state: State): Image.ImageLike | undefined {
  const e = state.entity_id;
  if (e.startsWith("light")) {
    const color = getLightTintColor(state);
    const source = getLightIconSource(state);
    return { source: source, tintColor: color };
  } else if (e.startsWith("person")) {
    return { source: "person.png", tintColor: PrimaryIconColor };
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
      {states?.map((state) => (
        <StateListItem key={state.entity_id} state={state} />
      ))}
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
  const stateValue = (state: State): string | undefined => {
    if (state.entity_id.startsWith("light") && state.state === "on") {
      const b = state.attributes.brightness || undefined;
      if (b !== undefined) {
        const bv = parseInt(b);
        if (!isNaN(bv)) {
          const percent = (bv / 255) * 100;
          return `${Math.round(percent)}%`;
        }
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
        }
      }
      return state.state;
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
      accessories={ensureCleanAccessories([
        {
          text: extraTitle(state) + stateValue(state),
        },
      ])}
    />
  );
}

export function StateActionPanel(props: { state: State }): JSX.Element {
  const state = props.state;
  const domain = props.state.entity_id.split(".")[0];
  const entityID = props.state.entity_id;

  switch (domain) {
    case "cover": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <Action
              title="Toggle"
              onAction={async () => await ha.toggleCover(props.state.entity_id)}
              icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Open"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => await ha.openCover(props.state.entity_id)}
              icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}
            />
            <Action
              title="Close"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => await ha.closeCover(props.state.entity_id)}
              icon={{ source: Icon.ChevronDown, tintColor: Color.PrimaryText }}
            />
            <Action
              title="Stop"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => await ha.stopCover(props.state.entity_id)}
              icon={{ source: Icon.XmarkCircle, tintColor: Color.PrimaryText }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attribtues">
            <ShowAttributesAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "fan": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <Action
              title="Toggle"
              onAction={async () => await ha.toggleFan(props.state.entity_id)}
              icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Turn On"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => await ha.turnOnFan(props.state.entity_id)}
              icon={{ source: "power-btn.png", tintColor: Color.Green }}
            />
            <Action
              title="Turn Off"
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => await ha.turnOffFan(props.state.entity_id)}
              icon={{ source: "power-btn.png", tintColor: Color.Red }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Speed">
            <FanSpeedControlAction state={state} />
            <FanSpeedUpAction state={state} />
            <FanSpeedDownAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "light": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <Action
              title="Toggle"
              onAction={async () => await ha.toggleLight(props.state.entity_id)}
              icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Turn On"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => await ha.turnOnLight(props.state.entity_id)}
              icon={{ source: "power-btn.png", tintColor: Color.Green }}
            />
            <Action
              title="Turn Off"
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => await ha.turnOffLight(props.state.entity_id)}
              icon={{ source: "power-btn.png", tintColor: Color.Red }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Brightness">
            <BrightnessControlAction state={state} />
            <BrightnessUpAction state={state} />
            <BrightnessDownAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Color">
            <ColorTempControlAction state={state} />
            <ColorTempControlUpAction state={state} />
            <ColorTempControlDownAction state={state} />
            <ColorRgbControlAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "media_player": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <Action
              title="Play/Pause"
              onAction={async () => await ha.playPauseMedia(entityID)}
              icon={{ source: "play-pause.jpg", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Play"
              onAction={async () => await ha.playMedia(entityID)}
              icon={{ source: "play.png", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Pause"
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={async () => await ha.pauseMedia(entityID)}
              icon={{ source: "pause.png", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Stop"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => await ha.stopMedia(entityID)}
              icon={{ source: Icon.XmarkCircle, tintColor: Color.PrimaryText }}
            />
            <Action
              title="Next"
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={async () => await ha.nextMedia(entityID)}
              icon={{ source: "next.png", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Previous"
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={async () => await ha.previousMedia(entityID)}
              icon={{ source: "previous.png", tintColor: Color.PrimaryText }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Volume">
            <Action
              title="Volume Up"
              shortcut={{ modifiers: ["cmd"], key: "+" }}
              onAction={async () => await ha.volumeUpMedia(entityID)}
              icon={{ source: Icon.SpeakerArrowUp, tintColor: Color.PrimaryText }}
            />
            <Action
              title="Volume Down"
              shortcut={{ modifiers: ["cmd"], key: "-" }}
              onAction={async () => await ha.volumeDownMedia(entityID)}
              icon={{ source: Icon.SpeakerArrowDown, tintColor: Color.PrimaryText }}
            />
            <SelectVolumeAction state={state} />
            <Action
              title="Mute"
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={async () => await ha.muteMedia(entityID)}
              icon={{ source: Icon.SpeakerSlash, tintColor: Color.PrimaryText }}
            />
            <SelectSourceAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Power">
            <MediaPlayerTurnOnAction state={state} />
            <MediaPlayerTurnOffAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
            <CopyTrackToClipboard state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "climate": {
      const tempStep = state.attributes.target_temp_step ?? 0.5;
      const minAllowedTemp = state.attributes.min_temp ?? 7;
      const maxAllowedTemp = state.attributes.max_temp ?? 35;
      // Sometimes, min_temp and max_temp are not multiples of tempStep.
      // Set the actual min and max to the nearest valid multiple of tempStep for consistency and display niceness.
      const minNormalizedTemp = Math.ceil(minAllowedTemp / tempStep) * tempStep;
      const maxNormalizedTemp = Math.floor(maxAllowedTemp / tempStep) * tempStep;
      const changeTempAllowed =
        state.state === "heat" || state.state === "cool" || state.state === "heat_cool" || state.state == "auto"
          ? true
          : false;
      const currentTempValue: number | undefined = state.attributes.temperature || undefined;
      const [currentTemp, setCurrentTemp] = useState<number | undefined>(currentTempValue);
      const upperTemp = currentTemp ? currentTemp + tempStep : undefined;
      const lowerTemp = currentTemp ? currentTemp - tempStep : undefined;

      const temps: number[] = range(minNormalizedTemp, maxNormalizedTemp, tempStep);

      const currentPresetMode = state.attributes.preset_mode ? state.attributes.preset_mode : "None";
      const preset_modes = state.attributes.preset_modes;

      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            {changeTempAllowed && (
              <ActionPanel.Submenu
                title={`Temperature (${currentTemp || "?"})`}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                icon={{ source: "temperature.png", tintColor: Color.PrimaryText }}
              >
                {temps.map((t) => (
                  <Action
                    key={t.toString()}
                    title={t.toString()}
                    onAction={async () => {
                      await ha.setClimateTemperature(entityID, t);
                      setCurrentTemp(t);
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
            {state.attributes.hvac_modes && (
              <ActionPanel.Submenu
                title={`Operation (${state.state})`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
              >
                {state.attributes.hvac_modes?.map((o: string) => (
                  <Action
                    key={o}
                    title={o}
                    onAction={async () => {
                      await ha.setClimateOperation(entityID, o);
                      popToRoot();
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
            )}

            {preset_modes && (
              <ActionPanel.Submenu
                title={`Preset (${currentPresetMode})`}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
              >
                {preset_modes?.map((o: string) => (
                  <Action
                    key={o}
                    title={o}
                    onAction={async () => {
                      await ha.setClimatePreset(entityID, o);
                      popToRoot();
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
            )}

            {upperTemp && changeTempAllowed && (
              <Action
                title={`Increase Temp. ${tempStep}`}
                shortcut={{ modifiers: ["cmd"], key: "+" }}
                onAction={async () => {
                  await ha.setClimateTemperature(entityID, upperTemp);
                  setCurrentTemp(upperTemp);
                }}
                icon={{ source: "plus.png", tintColor: Color.PrimaryText }}
              />
            )}
            {lowerTemp && changeTempAllowed && (
              <Action
                title={`Decrease Temp. ${tempStep}`}
                shortcut={{ modifiers: ["cmd"], key: "-" }}
                onAction={async () => {
                  await ha.setClimateTemperature(entityID, lowerTemp);
                  setCurrentTemp(lowerTemp);
                }}
                icon={{ source: "minus.png", tintColor: Color.PrimaryText }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "automation": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <AutomationTurnOnAction state={state} />
            <AutomationTurnOffAction state={state} />
            <AutomationTriggerAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "vacuum": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <VacuumLocateAction state={state} />
            <VacuumStartAction state={state} />
            <VacuumPauseAction state={state} />
            <VacuumStopAction state={state} />
            <VacuumTurnOnAction state={state} />
            <VacuumTurnOffAction state={state} />
            <VacuumReturnToBaseAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "camera": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Image">
            <CameraShowImage state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Controls">
            <CameraTurnOnAction state={state} />
            <CameraTurnOffAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "script": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <ScriptRunAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "button": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <ButtonPressAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "scene": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <SceneActivateAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "switch": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <Action
              title="Toggle"
              onAction={async () => await ha.toggleSwitch(props.state.entity_id)}
              icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
            />
            <Action
              title="Turn On"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => await ha.turnOnSwitch(props.state.entity_id)}
              icon={{ source: "power-btn.png", tintColor: Color.Green }}
            />
            <Action
              title="Turn Off"
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => await ha.turnOffSwitch(props.state.entity_id)}
              icon={{ source: "power-btn.png", tintColor: Color.Red }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "input_boolean": {
      return (
        <ActionPanel>
          <ActionPanel.Section>
            <InputBooleanToggleAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Controls">
            <InputBooleanOnAction state={state} />
            <InputBooleanOffAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "input_number": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <InputNumberIncrementAction state={state} />
            <InputNumberDecrementAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "timer": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <TimerStartAction state={state} />
            <TimerPauseAction state={state} />
            <TimerCancelAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "input_select": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <InputSelectOptionSelectAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "input_button": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <InputButtonPressAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "input_text": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <InputTextSetValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "input_datetime": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <InputDateTimeSetValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "update": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <UpdateShowChangelog state={state} />
            <UpdateOpenInBrowser state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Install">
            <UpdateInstallAction state={state} />
            <UpdateSkipVersionAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    case "weather": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <ShowWeatherAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Install">
            <UpdateInstallAction state={state} />
            <UpdateSkipVersionAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
    default: {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Attributes">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Values">
            <CopyEntityIDAction state={state} />
            <CopyStateValueAction state={state} />
          </ActionPanel.Section>
          <ActionPanel.Section title="History">
            <OpenEntityHistoryAction state={state} />
            <OpenEntityLogbookAction state={state} />
          </ActionPanel.Section>
        </ActionPanel>
      );
    }
  }
}

export function useStateSearch(
  query: string | undefined,
  domain: string,
  device_class?: string,
  allStates?: State[]
): {
  states?: State[];
} {
  const [states, setStates] = useState<State[]>();

  useEffect(() => {
    if (allStates) {
      let haStates: State[] = allStates;
      if (domain) {
        haStates = haStates.filter((s) => s.entity_id.startsWith(domain));
      }
      if (device_class) {
        haStates = haStates.filter((s) => s.attributes.device_class === device_class);
      }
      if (query) {
        haStates = haStates.filter(
          (e) =>
            e.entity_id.toLowerCase().includes(query.toLowerCase()) ||
            (e.attributes.friendly_name || "").toLowerCase().includes(query.toLowerCase())
        );
      }
      haStates = haStates.slice(0, 1000);
      setStates(haStates);
    } else {
      setStates([]);
    }
  }, [query, allStates]);
  return { states };
}
