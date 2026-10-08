import {
  getCapture,
  sampleActivity,
  searchCapturePage,
  timelineCover,
  type CaptureDetail,
  type TimelineArgs,
} from "./coast";
import { aroundMoment } from "./dates";
import { pageItems, type PageInput } from "./pagination";

export function orderedFrames(frames: CaptureDetail[]) {
  return [
    ...new Map(frames.map((frame) => [frame.frame_id, frame])).values(),
  ].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() ||
      a.frame_id - b.frame_id,
  );
}

export async function nearbyFrames(
  capture: CaptureDetail,
  filters?: Omit<TimelineArgs, "tr">,
) {
  const scope = { ...filters, tr: aroundMoment(capture.timestamp, 15) };
  const result = await timelineCover({ ...scope, minimumSeconds: 15 });
  return { scope, frames: orderedFrames([...result.frames, capture]) };
}

export type RelatedKind = "url" | "title" | "application";
export function relatedReason(
  source: CaptureDetail,
  candidate: CaptureDetail,
  kind: RelatedKind,
): string | undefined {
  if (source.frame_id === candidate.frame_id) return;
  if (
    kind === "url" &&
    source.url &&
    candidate.url &&
    source.url.split("#")[0] === candidate.url.split("#")[0]
  )
    return "Same URL (fragment ignored)";
  if (
    kind === "title" &&
    source.title.trim() &&
    source.application === candidate.application &&
    source.title.trim().toLowerCase() === candidate.title.trim().toLowerCase()
  )
    return "Same title in the same application";
  if (kind === "application" && source.application === candidate.application)
    return "Same application; representative capture";
}

export async function relatedMoments(
  frameId: number,
  tr: string,
  kind: RelatedKind = "title",
  input: PageInput = {},
) {
  const source = await getCapture(frameId);
  const phrase = kind === "url" ? source.url?.split("#")[0] : source.title;
  if (kind !== "application" && !phrase?.trim())
    return {
      source,
      matches: [],
      candidate_count: 0,
      pagination: pageItems([], input).pagination,
      warning: "This capture has no value for the requested match type.",
    };
  const page =
    kind === "application"
      ? pageItems(
          (await sampleActivity({ tr })).map(
            (segment) => segment.selected_frame,
          ),
          input,
        )
      : await searchCapturePage({
          query: `"${phrase!.replaceAll('"', '""')}"`,
          tr,
          ...input,
        });
  const candidates = "results" in page ? page.results : page.items;
  const matches = orderedFrames(candidates).flatMap((capture) => {
    const reason = relatedReason(source, capture, kind);
    return reason ? [{ capture, reason }] : [];
  });
  return {
    source,
    matches,
    candidate_count: candidates.length,
    pagination: page.pagination,
    warning:
      kind === "application"
        ? "Representative samples, not every recorded capture."
        : "Matches are verified against this page of FTS candidates. Continue candidate pages even when no exact matches appear; URLs not indexed in OCR or titles may be missed.",
  };
}
