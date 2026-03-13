import { TRANSPORT_MODES, TRANSPORT_MODE_TO_ICON } from "./constants";

export function uppercaseFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getTransportModeIcon(transportMode: string) {
  return TRANSPORT_MODE_TO_ICON[
    TRANSPORT_MODES.find((TRANSPORT_MODE) => TRANSPORT_MODE.outerValue === transportMode)?.innerValue || "subway"
  ];
}
