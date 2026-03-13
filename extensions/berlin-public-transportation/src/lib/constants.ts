import { Icon } from "@raycast/api";

export const API_URL = "https://v5.bvg.transport.rest";

export const TRANSPORT_MODE_TO_ICON: Record<string, Icon> = {
  SUBWAY: Icon.Train,
  SUBURBAN: Icon.Train,
  BUS: Icon.Car,
  TRAM: Icon.Train,
  FERRY: Icon.Boat,
};

export const TRANSPORT_MODES = [
  { innerValue: "subway", outerValue: "Subways (U-Bahn)" },
  { innerValue: "suburban", outerValue: "Suburban (S-Bahn)" },
  { innerValue: "bus", outerValue: "Buses" },
  { innerValue: "tram", outerValue: "Trams" },
  { innerValue: "ferry", outerValue: "Ferries" },
];
