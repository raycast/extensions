export enum DisplayMode {
  ON = "on",
  OFF = "off",
}

export enum FanMode {
  AUTO = "auto",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  QUIET = "quiet",
}

export enum HVACMode {
  COOL = "cool",
  AUTO = "auto",
  DRY = "dry",
  FAN = "fan",
  HEAT = "heat",
}

export enum PowerMode {
  ON = "on",
  OFF = "off",
}

export enum PresetMode {
  NONE = "none",
  ECO = "eco",
  BOOST = "boost",
  CLEAN = "clean",
}

export enum SwingMode {
  AUTO = 0,
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

export enum ConvertiMode {
  HC = 110,
  FC = 100,
  C90 = 90,
  C80 = 80,
  C70 = 70,
  C55 = 55,
  C40 = 40,
  NS = 1,
  OFF = 0,
}

export enum ConsumptionPeriodType {
  DAILY = "Daily",
  WEEKLY = "Weekly",
  MONTHLY = "Monthly",
}

export function getConsumptionResponseKey(periodType: ConsumptionPeriodType): string {
  const mapping: Record<ConsumptionPeriodType, string> = {
    [ConsumptionPeriodType.DAILY]: "day",
    [ConsumptionPeriodType.WEEKLY]: "week",
    [ConsumptionPeriodType.MONTHLY]: "month",
  };
  return mapping[periodType];
}
