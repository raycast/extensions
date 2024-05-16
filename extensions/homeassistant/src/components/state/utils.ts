import { getBatteryIconFromState } from "@components/battery/utils";
import { getLightCurrentBrightnessPercentage, getLightRGBFromState } from "@components/light/utils";
import { weatherConditionToIcon } from "@components/weather/utils";
import { RGBtoString, changeRGBBrightness } from "@lib/color";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { sleep } from "@lib/utils";
import { Color, Image, getPreferenceValues } from "@raycast/api";

/**
 * Sleep to get state changes
 */
export async function stateChangeSleep() {
  await sleep(1000);
}

/**
 * Filter via preferences "includedEntities" and "excludedEntities" if they exist for the active command
 * @param states States which should be filtered
 * @param mainPattern The main pattern for the filter e.g. ["light.*"]
 * @returns
 */
export function filterViaPreferencePatterns(states: State[] | undefined, mainPattern: string[]) {
  const includedPatterns = includedEntitiesPreferences({ fallback: mainPattern });
  const excludedPatterns = excludedEntitiesPreferences();
  const filterKeepOrder = () => {
    let res: State[] = [];
    for (const includePattern of includedPatterns) {
      const f = filterStates(states, { include: [includePattern], exclude: excludedPatterns });
      if (f && f.length > 0) {
        res = res.concat(f);
      }
    }
    return res;
  };
  const entitiesFiltered = filterKeepOrder();

  const entities = filterStates(entitiesFiltered, { include: mainPattern });
  return entities;
}

export function includedEntitiesPreferences(options?: { fallback?: string[] }): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.includedEntities;
  if (!hidden) {
    return options?.fallback ? options.fallback : [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}

export function excludedEntitiesPreferences(): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.excludedEntities;
  if (!hidden) {
    return [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}

function wildcardFilter(filter: string, text: string) {
  const r = new RegExp("^" + filter.replace(/\*/g, ".*") + "$").test(text);
  return r;
}

function wildcardFilters(filters: string[], text: string) {
  for (const f of filters) {
    const r = wildcardFilter(f, text);
    if (r) {
      return true;
    }
  }
  return false;
}

export function filterStates(states: State[] | undefined, options?: { include?: string[]; exclude?: string[] }) {
  if (!states) {
    return states;
  }
  let result = states;
  const inc = options?.include;
  if (inc && inc.length > 0) {
    result = result.filter((s) => wildcardFilters(inc, s.entity_id));
  }
  const ex = options?.exclude;
  if (ex && ex.length > 0) {
    result = result.filter((s) => !wildcardFilters(ex, s.entity_id));
  }
  return result;
}

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
      return getBatteryIconFromState(state);
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
