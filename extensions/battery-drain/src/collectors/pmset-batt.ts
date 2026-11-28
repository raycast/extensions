import { PowerSource } from "../types";

export function parsePmsetBatt(text: string): PowerSource | undefined {
  const sourceMatch = /Now drawing from '([^']+)'/.exec(text);
  if (!sourceMatch) return undefined;
  // Only 'Battery Power' means the MacBook runs on its own battery; a desktop on a UPS is on external power.
  const source = sourceMatch[1] === "Battery Power" ? "battery" : "ac";

  // Only the Mac's own battery: a UPS is listed the same way under its model name.
  // The gap before the percentage is a TAB in real output; match any whitespace so fixtures cannot drift.
  const detail = /-InternalBattery-\d+[^\n]*?\s(\d+)%; ([^;]+);\s*([^\n]*)/.exec(text);
  if (!detail) return { source };

  const remaining = /(\d+):(\d{2}) remaining/.exec(detail[3]);
  return {
    source,
    percent: Number(detail[1]),
    state: detail[2].trim(),
    minutesRemaining: remaining ? Number(remaining[1]) * 60 + Number(remaining[2]) : undefined,
  };
}
