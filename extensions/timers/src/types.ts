import { Icon } from "@raycast/api";

export interface Timer {
  name: string;
  secondsSet: number;
  timeLeft: number;
  originalFile: string;
  timeEnds: Date;
}

export interface Stopwatch {
  name: string;
  swID: string;
  timeStarted: Date;
  timeElapsed: number;
  lastPaused: Date | "----";
  pauseElapsed: number;
}

export interface Values {
  hours: string;
  minutes: string;
  seconds: string;
  name: string;
  willBeSaved: boolean;
  selectedSound: string;
}

export interface CustomTimer {
  name: string;
  timeInSeconds: number;
  selectedSound: string;
}

export interface Preferences {
  showMenuBarItemWhen: "never" | "onlyWhenRunning" | "always";
  selectedSound: string;
  ringContinuously: boolean;
  copyOnSwStop: boolean;
  volumeSetting: string;
  showTitleInMenuBar: boolean;
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
