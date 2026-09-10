import type { CaptureDetail } from "./coast";

export function captureSubtitle(capture: CaptureDetail): string | undefined {
  const title = capture.title || capture.application;
  const subtitle = capture.domain || capture.application;
  return title.trim().toLowerCase() === subtitle.trim().toLowerCase()
    ? undefined
    : subtitle;
}

export function groupMoments(captures: CaptureDetail[]): CaptureDetail[][] {
  const groups: CaptureDetail[][] = [];
  const seen = new Set<number>();
  for (const capture of [...captures].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  )) {
    if (seen.has(capture.frame_id)) continue;
    seen.add(capture.frame_id);
    const group = groups.at(-1);
    const previous = group?.at(-1);
    const sameContext =
      previous &&
      previous.application === capture.application &&
      previous.title === capture.title &&
      previous.url === capture.url;
    const gap = previous
      ? new Date(capture.timestamp).getTime() -
        new Date(previous.timestamp).getTime()
      : Infinity;
    if (sameContext && gap <= 120_000) group!.push(capture);
    else groups.push([capture]);
  }
  return groups;
}
