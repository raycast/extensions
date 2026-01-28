export const sportNames: { [key: string]: string } = {
  AlpineSki: "Alpine Ski",
  BackcountrySki: "Backcountry Ski",
  Canoeing: "Canoeing",
  Crossfit: "Crossfit",
  EBikeRide: "E-Bike Ride",
  EMountainBikeRide: "E-Mountain Bike Ride",
  Elliptical: "Elliptical",
  GravelRide: "Gravel Ride",
  Handcycle: "Handcycle",
  Hike: "Hike",
  IceSkate: "Ice Skate",
  InlineSkate: "Inline Skate",
  Kayaking: "Kayaking",
  Kitesurf: "Kitesurf",
  NordicSki: "Nordic Ski",
  MountainBikeRide: "Mountain Bike Ride",
  Ride: "Ride",
  RockClimbing: "Rock Climbing",
  RollerSki: "Roller Ski",
  Rowing: "Rowing",
  Run: "Run",
  Snowboard: "Snowboard",
  Snowshoe: "Snowshoe",
  StairStepper: "Stair Stepper",
  StandUpPaddling: "Stand Up Paddling",
  Surfing: "Surfing",
  Swim: "Swim",
  TrailRun: "Trail Run",
  VirtualRide: "Virtual Ride",
  VirtualRun: "Virtual Run",
  Velomobile: "Velomobile",
  Walk: "Walk",
  WeightTraining: "Weight Training",
  Windsurf: "Windsurf",
  Workout: "Workout",
  Wheelchair: "Wheelchair",
  Yoga: "Yoga",
};

export const sportIcons: { [key: string]: string } = {
  Run: "run.svg",
  Ride: "ride.svg",
  VirtualRide: "ride.svg",
  EBikeRide: "ride-Ebike.svg",
  Swim: "swim.svg",
  Hike: "hike.svg",
  Walk: "walk.svg",
  AlpineSki: "ski.svg",
  NordicSki: "ski.svg",
  Workout: "workout.svg",
  WeightTraining: "workout.svg",
  Yoga: "yoga.svg",
};

export const distancePresets = {
  Marathon: { km: "42.195", mi: "26.219" },
  "Half-Marathon": { km: "21.0975", mi: "13.1095" },
} as const;

export interface PaceCalculatorForm {
  distance: string;
  time: string;
  pace: string;
  distanceUnit: "km" | "mi";
  preset?: string;
  mode: CalculationMode;
}

export type DistancePreset = keyof typeof distancePresets;

export type CalculationMode = "pace" | "time";
