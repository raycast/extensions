export interface caffeinatePreferences {
  preventDisplay: boolean;
  preventDisk: boolean;
  preventSystem: boolean;
}

export interface CaffeinateFormValues {
  hours: string;
  minutes: string;
  seconds: string;
  [key: string]: string;
}

export interface Process {
  [key: string]: string;
}
