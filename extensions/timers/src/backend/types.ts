import { Icon } from "@raycast/api";

export interface Timer {
  name: string;
  secondsSet: number;
  timeLeft: number;
  originalFile: string;
  timeEnds: Date;
  pid: number | undefined; // undefined when timer is paused
  lastPaused: Date | "---"; // "---" when timer is unpaused
  pauseElapsed: number;
  selectedSound: string;
}

export interface RawTimer {
  name: string;
  pid: number | undefined; // undefined when timer is paused
  lastPaused: Date | "---"; // "---" when timer is unpaused
  pauseElapsed: number;
  selectedSound: string;
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
  showInMenuBar: boolean;
}

export interface Preferences {
  showMenuBarIconWhen: "never" | "onlyWhenRunning" | "onlyWhenNotRunning" | "always";
  selectedSound: string;
  ringContinuously: boolean;
  copyOnSwStop: boolean;
  closeWindowOnTimerStart: boolean;
  volumeSetting: string;
  showTitleInMenuBar: boolean;
  newTimerInputOrder: string;
  customTimerFormBypass: boolean;
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

export interface CommandLinkParams {
  timerID: string;
}

export interface DefaultTimerPreset {
  key: string;
  title: string;
  seconds: number;
}

export interface TimerLaunchConfig {
  timeInSeconds: number;
  launchedFromMenuBar?: boolean;
  timerName?: string;
  selectedSound?: string;
}

export interface StopwatchLaunchConfig {
  swName?: string;
  launchedFromMenuBar?: boolean;
}

export interface CTLaunchConfig {
  customTimer: CustomTimer;
  launchedFromMenuBar?: boolean;
}
