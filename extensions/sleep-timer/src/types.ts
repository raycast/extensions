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

export interface CTInlineArgs {
  hours: string;
  minutes: string;
  seconds: string;
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
