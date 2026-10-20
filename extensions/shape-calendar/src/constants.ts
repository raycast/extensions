import { Icon } from "@raycast/api";
import { SportType } from "./api/types";

export const sportIcons: Record<SportType, Icon> = {
  run: Icon.Footprints,
  bike: Icon.Bike,
  swim: Icon.Droplets,
  hike: Icon.Mountain,
  yoga: Icon.Leaf,
  tennis: Icon.TennisBall,
  skiing: Icon.CloudSnow,
  nordicski: Icon.Snowflake,
  strength: Icon.Weights,
  surf: Icon.Wind,
  other: Icon.Heartbeat,
};

export const sportNames: Record<SportType, string> = {
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  hike: "Hike",
  yoga: "Yoga",
  tennis: "Tennis",
  skiing: "Skiing",
  nordicski: "Nordic Ski",
  strength: "Strength",
  surf: "Surf",
  other: "Other",
};
