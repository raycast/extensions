export interface Timer {
  name: string;
  secondsSet: number;
  timeLeft: number;
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
}
