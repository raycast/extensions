import { Icon } from "@raycast/api";
import { Observation } from "./types";

export const isObservationImage = (observation: Observation) => {
  return observation.file_type === "jpg" || observation.file_type === "png";
};

export const isObservationJSON = (observation: Observation) => {
  return observation.file_type === "json";
};

export function getObservationIcon(observation: Observation): Icon {
  const iconsMap = {
    jpg: Icon.Image,
    png: Icon.Image,
    json: Icon.Document,
    csv: Icon.Document,
    ecsv: Icon.Document,
    fits: Icon.Layers,
  } as Record<string, Icon>;

  return iconsMap[observation.file_type] ?? Icon.Binoculars;
}

export function getColorByFileType(fileType: string): string | undefined {
  const colorsMap = {
    jpg: "#77ee35",
    png: "#35eed5",
    json: "#e56e5a",
    csv: "#a673e8",
    ecsv: "#eed535",
    fits: "#ebe6d9",
  } as Record<string, string | null>;

  return colorsMap[fileType] ?? undefined;
}
