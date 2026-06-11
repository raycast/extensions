import { Icon } from "@raycast/api";
import { SportType } from "./api/types";

export const sportIcons: Record<SportType, Icon> = {
  run: Icon.Footprints,
  bike: Icon.Bike,
  swim: Icon.Droplets,
  hike: Icon.Mountain,
  yoga: Icon.Leaf,
  nordicski: Icon.Snowflake,
  strength: Icon.Weights,
  other: Icon.Heartbeat,
};

export const sportNames: Record<SportType, string> = {
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  hike: "Hike",
  yoga: "Yoga",
  nordicski: "Nordic Ski",
  strength: "Strength",
  other: "Other",
};
