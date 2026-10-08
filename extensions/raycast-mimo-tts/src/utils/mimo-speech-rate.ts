import { Toast, showToast } from "@raycast/api";
import { formatSpeed, parseRateString, setSpeedOverride } from "./mimo-playback-state";

export async function adjustSpeechRate({
  currentRate,
  delta,
  onRateChange,
}: {
  currentRate: string;
  delta: number;
  onRateChange: (clampedRate: number) => void;
}): Promise<void> {
  const next = parseRateString(currentRate) + delta;
  const clamped = await setSpeedOverride(next);
  onRateChange(clamped);
  await showToast({ style: Toast.Style.Success, title: `Speed ${formatSpeed(clamped)}` });
}
