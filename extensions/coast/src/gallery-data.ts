import {
  sampleActivity,
  timelineCover,
  type CaptureDetail,
  type TimelineArgs,
} from "./coast";
import { orderedFrames } from "./discovery";

export async function loadGalleryFrames(
  scope: TimelineArgs,
  detailed: boolean,
) {
  const frames = detailed
    ? (await timelineCover({ ...scope, minimumSeconds: 15 })).frames
    : (await sampleActivity(scope)).map((segment) => segment.selected_frame);
  return orderedFrames(frames);
}

export function filterGalleryFrames(frames: CaptureDetail[], query: string) {
  const term = query.trim().toLocaleLowerCase();
  return frames.filter(
    (frame) =>
      !term ||
      `${frame.title} ${frame.application} ${frame.domain || ""}`
        .toLocaleLowerCase()
        .includes(term),
  );
}
