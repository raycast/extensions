import { Icon } from "@raycast/api";

export interface Timer {
  name: string;
  secondsSet: number;
  timeLeft: number;
  originalFile: string;
}

export interface Stopwatch {
  name: string;
  timeStarted: Date;
  timeElapsed: number;
  originalFile: string;
}

export interface Values {
  hours: string;
  minutes: string;
  seconds: string;
  name: string;
  willBeSaved: boolean;
}

export interface CustomTimer {
  name: string;
  timeInSeconds: number;
}

export interface Preferences {
  selectedSound: string;
  ringContinuously: boolean;
  copyOnSwStop: boolean;
}

export interface CTInlineArgs {
  hours: string;
  minutes: string;
  seconds: string;
}

export interface SWInlineArgs {
  name: string;
}

export interface InputField {
  id: keyof CTInlineArgs;
  title: string;
  placeholder: string;
  err: string | undefined;
  drop: () => void;
  validator: (event: RayFormEvent) => void;
}

export interface RayFormEvent {
  target: {
    value?: string | undefined;
  };
}

export interface SoundData {
  title: string;
  icon: Icon;
  value: string;
}
