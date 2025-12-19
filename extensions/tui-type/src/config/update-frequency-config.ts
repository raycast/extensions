import { UpdateFreq } from "../types";
import { Icon } from "@raycast/api";

export interface UpdateFreqOption {
  value: UpdateFreq;
  title: string;
  delayMs: number;
  icon?: Icon;
}

export const UPDATE_FREQ_OPTIONS: UpdateFreqOption[] = [
  {
    value: "instant",
    title: "Instant (Highest CPU)",
    delayMs: 0,
  },
  {
    value: "fast",
    title: "Fast (200ms)",
    delayMs: 200,
  },
  {
    value: "slow",
    title: "Slow (500ms)",
    delayMs: 500,
  },
  {
    value: "very_slow",
    title: "Very Slow (1000ms)",
    delayMs: 1000,
  },
];

export const getUpdateDelay = (freq: UpdateFreq): number => {
  const option = UPDATE_FREQ_OPTIONS.find((opt) => opt.value === freq);
  return option?.delayMs ?? 200;
};
