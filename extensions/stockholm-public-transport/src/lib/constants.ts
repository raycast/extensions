import { Icon } from "@raycast/api";

export const API_URL = "https://sl-api.onrender.com";

export const TRANSPORT_MODE_TO_ICON: Record<string, Icon> = {
  METRO: Icon.Train,
  BUS: Icon.Car,
  TRAIN: Icon.Train,
  TRAM: Icon.Train,
  SHIP: Icon.Boat,
};

export const TRANSPORT_MODES = [
  { innerValue: "METRO", outerValue: "Metros" },
  { innerValue: "BUS", outerValue: "Buses" },
  { innerValue: "TRAIN", outerValue: "Trains" },
  { innerValue: "TRAM", outerValue: "Trams" },
  { innerValue: "SHIP", outerValue: "Ships" },
];
