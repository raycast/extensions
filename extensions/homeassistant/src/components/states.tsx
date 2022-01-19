import { ActionPanel, Color, ColorLike, Icon, ImageLike, List, popToRoot, showToast, ToastStyle } from "@raycast/api";
import { State } from "../haapi";
import { useState, useEffect } from "react";
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
} from "./mediaplayer";
import {
  BrightnessControlAction,
  BrightnessDownAction,
  BrightnessUpAction,
  ColorTempControlAction,
  ColorTempControlDownAction,
  ColorTempControlUpAction,
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

const PrimaryIconColor = Color.Blue;
const UnavailableColor = "#bdbdbd";

const lightColor: Record<string, ColorLike> = {
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

function getDeviceClassIcon(state: State): ImageLike | undefined {
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

function getLightTintColor(state: State): ColorLike {
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

function getIcon(state: State): ImageLike | undefined {
  const e = state.entity_id;
  if (e.startsWith("light")) {
    const color = getLightTintColor(state);
    const source = getLightIconSource(state);
    return { source: source, tintColor: color };
  } else if (e.startsWith("person")) {
    return { source: "person.png", tintColor: PrimaryIconColor };
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
    showToast(ToastStyle.Failure, "Cannot search Home Assistant states.", error.message);
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
        }
      }
      return state.state;
    }
    return state.state;
  };

  let icon: ImageLike | undefined;
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
      accessoryTitle={extraTitle(state) + stateValue(state)}
      actions={<StateActionPanel state={state} />}
      icon={icon || getIcon(state)}
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
            <ActionPanel.Item
              title="Toggle"
              onAction={async () => await ha.toggleCover(props.state.entity_id)}
              icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Open"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => await ha.openCover(props.state.entity_id)}
              icon={{ source: Icon.ChevronUp, tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Close"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => await ha.closeCover(props.state.entity_id)}
              icon={{ source: Icon.ChevronDown, tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
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
    case "light": {
      return (
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <ActionPanel.Item
              title="Toggle"
              onAction={async () => await ha.toggleLight(props.state.entity_id)}
              icon={{ source: "toggle.png", tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Turn On"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => await ha.turnOnLight(props.state.entity_id)}
              icon={{ source: "power-btn.png", tintColor: Color.Green }}
            />
            <ActionPanel.Item
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
          <ActionPanel.Section title="Color Temperature">
            <ColorTempControlAction state={state} />
            <ColorTempControlUpAction state={state} />
            <ColorTempControlDownAction state={state} />
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
            <ActionPanel.Item
              title="Play/Pause"
              onAction={async () => await ha.playPauseMedia(entityID)}
              icon={{ source: "play-pause.jpg", tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Play"
              onAction={async () => await ha.playMedia(entityID)}
              icon={{ source: "play.png", tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Pause"
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={async () => await ha.pauseMedia(entityID)}
              icon={{ source: "pause.png", tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Stop"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => await ha.stopMedia(entityID)}
              icon={{ source: Icon.XmarkCircle, tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Next"
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={async () => await ha.nextMedia(entityID)}
              icon={{ source: "next.png", tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Previous"
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={async () => await ha.previousMedia(entityID)}
              icon={{ source: "previous.png", tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Volume Up"
              shortcut={{ modifiers: ["cmd"], key: "+" }}
              onAction={async () => await ha.volumeUpMedia(entityID)}
              icon={{ source: Icon.SpeakerArrowUp, tintColor: Color.PrimaryText }}
            />
            <ActionPanel.Item
              title="Volume Down"
              shortcut={{ modifiers: ["cmd"], key: "-" }}
              onAction={async () => await ha.volumeDownMedia(entityID)}
              icon={{ source: Icon.SpeakerArrowDown, tintColor: Color.PrimaryText }}
            />
            <SelectVolumeAction state={state} />
            <ActionPanel.Item
              title="Mute"
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={async () => await ha.muteMedia(entityID)}
              icon={{ source: Icon.SpeakerSlash, tintColor: Color.PrimaryText }}
            />
            <SelectSourceAction state={state} />
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
      const changeTempAllowed =
        state.state === "heat" || state.state === "cool" || state.state === "heat_cool" || state.state == "auto"
          ? true
          : false;
      const currentTempValue: number | undefined = state.attributes.temperature || undefined;
      const [currentTemp, setCurrentTemp] = useState<number | undefined>(currentTempValue);
      const upperTemp = currentTemp ? currentTemp + 0.5 : undefined;
      const lowerTemp = currentTemp ? currentTemp - 0.5 : undefined;

      const temps: number[] = [];
      for (let i = 26; i > 16; i--) {
        temps.push(i);
      }

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
                  <ActionPanel.Item
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
                  <ActionPanel.Item
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
                  <ActionPanel.Item
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
              <ActionPanel.Item
                title={`Increase Temp. 0.5`}
                shortcut={{ modifiers: ["cmd"], key: "+" }}
                onAction={async () => {
                  await ha.setClimateTemperature(entityID, upperTemp);
                  setCurrentTemp(upperTemp);
                }}
                icon={{ source: "plus.png", tintColor: Color.PrimaryText }}
              />
            )}
            {lowerTemp && changeTempAllowed && (
              <ActionPanel.Item
                title={`Decrease Temp. 0.5`}
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
      haStates = haStates.slice(0, 100);
      setStates(haStates);
    } else {
      setStates([]);
    }
  }, [query, allStates]);
  return { states };
}
