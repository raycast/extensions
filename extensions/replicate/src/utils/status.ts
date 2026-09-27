import { Color } from "@raycast/api";
import { Prediction, PredictionStatus } from "../types";

export const POLL_INTERVAL_MS = 2500;

export const TERMINAL_STATUSES: PredictionStatus[] = ["succeeded", "failed", "canceled"];

export const isRunning = (prediction: Pick<Prediction, "status">) => !TERMINAL_STATUSES.includes(prediction.status);

export const STATUS_COLORS: Record<PredictionStatus, Color> = {
  starting: Color.Yellow,
  processing: Color.Blue,
  succeeded: Color.Green,
  failed: Color.Red,
  canceled: Color.SecondaryText,
};

export const logPercent = (logs?: string | null) => [...(logs ?? "").matchAll(/(\d{1,3})%\|/g)].at(-1)?.[1];
