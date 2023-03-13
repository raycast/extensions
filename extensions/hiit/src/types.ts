export type Item = {
  id?: string;
  title: string;
  subtitle: string;
  interval: {
    warmup: number;
    cooldown: number;
    high: number;
    low: number;
    sets: number;
    intervals: number;
    totalTime: number;
  };
  date?: number;
  finished?: boolean;
  note?: string;
};

export type IntervalFormValues = {
  title: string;
  subtitle: string;
  warmup: string | undefined;
  cooldown: string | undefined;
  high: string;
  low: string;
  sets: string;
};

export type NoteFormValues = {
  note: string;
};

export type Preferences = {
  beep: boolean;
  intervalbeep: string;
};
