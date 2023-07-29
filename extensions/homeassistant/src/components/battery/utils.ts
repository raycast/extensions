import { State } from "../../haapi";

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

export function batteryStateValue(state: State) {
  const val = parseFloat(state.state);
  if (Number.isNaN(val)) {
    return state.state;
  }
  return `${state.state}%`;
}
