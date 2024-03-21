import { PrimaryIconColor } from "@components/state/utils";
import { State } from "@lib/haapi";
import { Color, Image } from "@raycast/api";

export function sortBatteries(states: State[] | undefined) {
  if (!states) {
    return states;
  }
  const stateValue = (state: string) => {
    const s = state;
    if (s === "unavailable") {
      return -2;
    }
    if (s === "unknown") {
      return 1;
    }
    return parseFloat(s);
  };
  const sortedStates = states?.sort((s1, s2) => {
    const s1v = stateValue(s1.state);
    const s2v = stateValue(s2.state);
    if (s1v === s2v) {
      return 0;
    }
    return s1v < s2v ? -1 : 1;
  });
  return sortedStates;
}

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

export function getBatteryIconSourceForValue(value: number | undefined): string {
  const fallback = "battery-100.png";
  if (value === undefined) {
    return fallback;
  }
  if (!isNaN(value)) {
    const level = Math.floor(value / 10);
    const levelIcon = batterLevelIcons[level];
    if (levelIcon) {
      const src = levelIcon;
      return src;
    }
  }
  return fallback;
}

export function getBatteryIconFromState(state: State): Image.ImageLike | undefined {
  const v = parseFloat(state.state);
  const src = getBatteryIconSourceForValue(v);
  let tintColor = PrimaryIconColor;
  if (v <= 20) {
    tintColor = Color.Red;
  } else if (v <= 30) {
    tintColor = Color.Yellow;
  }
  return { source: src, tintColor: tintColor };
}

export function filterBatteries(
  states: State[] | undefined,
  options?: { onFilterState?: (value: number) => void },
): State[] | undefined {
  if (!states) {
    return states;
  }
  let batteries = states?.filter((s) => s.attributes.device_class === "battery");
  const onFilterState = options?.onFilterState;
  if (onFilterState) {
    batteries = batteries.filter((b) =>
      onFilterState(b.state === "unavailable" || b.state === "unknown" ? 0 : parseFloat(b.state)),
    );
  }
  return batteries;
}

export function getBatteryStateValue(state: State): number {
  const val = parseFloat(state.state);
  return Number.isNaN(val) ? 0 : val;
}

export function batteryStateValue(state: State) {
  const val = parseFloat(state.state);
  if (Number.isNaN(val)) {
    return state.state;
  }
  return `${state.state}%`;
}
