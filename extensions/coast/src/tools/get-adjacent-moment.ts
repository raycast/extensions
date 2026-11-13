import { getCapture } from "../coast";
import { nearbyFrames } from "../discovery";
import { captureEvidence } from "../evidence";
type Input = {
  /** Starting frame ID. */
  frameId: number;
  /** Move to the previous or next representative capture. */
  direction: "previous" | "next";
  /** Application bundle IDs to retain while navigating. */
  appFilters?: string[];
  /** Domains to retain while navigating. */
  domainFilters?: string[];
};
/** Find a neighboring selected moment within 15 minutes of a frame, retaining explicit filters. An omitted capture means no match in this bounded window, not end of history. */
export default async function tool(input: Input) {
  const source = await getCapture(input.frameId);
  const { scope, frames } = await nearbyFrames(source, input);
  const index = frames.findIndex((frame) => frame.frame_id === input.frameId);
  const frame = frames[index + (input.direction === "next" ? 1 : -1)];
  return {
    scope,
    selection: "representative",
    capture: frame ? captureEvidence(frame) : undefined,
    warning:
      "Bounded 15-minute window; selected frames may skip intervening captures.",
  };
}
