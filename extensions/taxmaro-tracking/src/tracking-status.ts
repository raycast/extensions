import { DurationFormat } from "@formatjs/intl-durationformat";
import * as z from "zod";

export const TrackingStatus = z.object({
  running: z.boolean(),
  closedDurationSeconds: z.number(),
  currentRunElapsedSeconds: z.number(),
  fetchedAt: z.number(),
});

export type TrackingStatus = z.infer<typeof TrackingStatus>;

export const currentRunSeconds = (status: TrackingStatus, relativeTo = Date.now()): number => {
  if (!status.running) return 0;
  const secondsSinceFetch = Math.max(0, Math.floor((relativeTo - status.fetchedAt) / 1_000));
  return status.currentRunElapsedSeconds + secondsSinceFetch;
};

export const todaySeconds = (status: TrackingStatus, relativeTo = Date.now()): number => {
  return status.closedDurationSeconds + currentRunSeconds(status, relativeTo);
};

export const optimisticallySetRunning = (
  status: TrackingStatus,
  running: boolean,
  relativeTo = Date.now(),
): TrackingStatus => {
  if (status.running === running) return status;

  if (running) {
    return {
      ...status,
      running: true,
      currentRunElapsedSeconds: 0,
      fetchedAt: relativeTo,
    };
  }

  return {
    ...status,
    running: false,
    closedDurationSeconds: todaySeconds(status, relativeTo),
    currentRunElapsedSeconds: 0,
    fetchedAt: relativeTo,
  };
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale;

const digitalDuration = new DurationFormat(locale, {
  style: "digital",
  minutesDisplay: "always",
  secondsDisplay: "auto",
});

const shortDuration = new DurationFormat(locale, {
  style: "short",
  minutesDisplay: "always",
  secondsDisplay: "auto",
});

export const formatDuration = (seconds: number, style: "digital" | "short" = "digital"): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);

  return (style === "digital" ? digitalDuration : shortDuration).format({ hours, minutes });
};
