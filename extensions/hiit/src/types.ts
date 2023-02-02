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
};

export type IntervalFormValues = {
  title: string;
  subtitle: string;
  warmup: string;
  cooldown: string;
  high: string;
  low: string;
  sets: string;
};
