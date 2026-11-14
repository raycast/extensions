import { sampleActivity, timelineCover } from "./coast";
import { offsetDate, recentRange, today } from "./dates";
import { orderedFrames } from "./discovery";

export type TimelinePreset =
  "cover-30m" | "sample-1h" | "sample-today" | "sample-yesterday";

export async function loadTimeline(preset: TimelinePreset) {
  const scope = {
    tr:
      preset === "cover-30m"
        ? recentRange(30)
        : preset === "sample-1h"
          ? recentRange(60)
          : preset === "sample-yesterday"
            ? offsetDate(1)
            : today(),
  };
  const frames =
    preset === "cover-30m"
      ? (await timelineCover({ ...scope, minimumSeconds: 15 })).frames
      : (await sampleActivity(scope)).map((segment) => segment.selected_frame);
  return { scope, frames: orderedFrames(frames) };
}
