import { Color, Icon } from "@raycast/api";

export interface Pet {
  key: string;
  type: string;
  sprite: string;
}

export interface PetState {
  pet: Pet;
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
  cleanliness: number;
  lastUpdated: number;
  adopted: number;
  isSleeping?: boolean;
  sleepUntil?: number;
  lastHealed?: number;
}

export enum StatusLevel {
  Critical = "Critical",
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Perfect = "Perfect",
}

export enum ActionName {
  Feeding = "Feeding",
  Playing = "Playing",
  Cleaning = "Cleaning",
  Resting = "Resting",
  Healing = "Healing",
  WakeUp = "Wake Up",
  CheckingStatus = "Checking Status",
  Debug = "Debug",
}

export interface StatusInfo {
  level: StatusLevel;
  color: Color;
  icon: Icon;
}

export interface StatusTag {
  text: string;
  color: Color;
}
