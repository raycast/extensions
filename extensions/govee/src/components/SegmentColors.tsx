import { Icon, Toast, showToast } from "@raycast/api";

import type { CloudDevice } from "@/lib/cloud";
import { sendLanSegments } from "@/lib/lanSegments";
import { MAX_COLORS, gradient, groupBy, sendSegments, split } from "@/lib/segments";

import SetColorGrid from "@/components/SetColorGrid";

// The running job per light. A new Split/Gradient replaces the old one, so a job still waiting
// for the cloud's rate limit can't resume later and overwrite the newer colours.
const jobs = new Map<string, symbol>();

/**
 * Multicolour strip: tick colours in order (Enter), then ⌘↵ split them into equal blocks or
 * ⌘⇧↵ blend them into a gradient across the whole strip. Over LAN when the light is on LAN and
 * its model is known to take segment packets (instant, no limit); otherwise through the cloud.
 */
const SegmentColors = ({
  segments,
  name,
  lanIp,
  cloud,
}: {
  segments: number[];
  name: string;
  lanIp?: string;
  cloud?: CloudDevice;
}) => {
  // The cloud allows 10 commands per light per minute, so it gets at most MAX_COLORS bands.
  const maxColors = lanIp ? segments.length : MAX_COLORS;

  // `plan(max)` builds the strip's colours using at most `max` distinct colours.
  const apply = async (plan: (max: number) => string[], label: string) => {
    const light = cloud?.id ?? lanIp ?? name;
    const job = Symbol(label);
    jobs.set(light, job);
    const stopped = () => jobs.get(light) !== job;
    const toast = await showToast({ style: Toast.Style.Animated, title: `${label} on ${name}…` });
    let error: string | undefined;
    if (lanIp) {
      try {
        await sendLanSegments(lanIp, groupBy(plan(segments.length), segments));
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }
    if (!lanIp || (error && cloud)) {
      error = cloud
        ? await sendSegments(
            cloud,
            groupBy(plan(MAX_COLORS), segments),
            (left, total, secs) => (toast.message = `${left} of ${total} waiting for Govee's limit — ${secs}s`),
            (done, total) => (toast.message = `${done} of ${total}`),
            undefined,
            stopped,
          )
        : "This light needs the Govee API key for subsection coloring";
    }
    if (stopped()) {
      toast.style = Toast.Style.Success;
      toast.title = `${label} replaced by a newer one`;
      toast.message = undefined;
      return;
    }
    jobs.delete(light);
    toast.style = error ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = error ? `${label} stopped partway` : `${label} applied`;
    toast.message = error;
  };

  return (
    <SetColorGrid
      multiple={{
        initial: [],
        max: maxColors,
        title: `${name} — Subsection Coloring`,
        hint: "Pick a few colors, then apply them as Split or Gradient",
        applies: [
          {
            title: "Apply as Split",
            icon: Icon.AppWindowGrid2x2,
            run: (hexes) => apply((max) => split(segments.length, hexes.slice(0, max)), "Split"),
          },
          {
            title: "Apply as Gradient",
            icon: Icon.Swatch,
            shortcut: { key: "return", modifiers: ["cmd", "shift"] },
            run: (hexes) => apply((max) => gradient(segments.length, hexes.slice(0, max), max), "Gradient"),
          },
        ],
      }}
    />
  );
};

export default SegmentColors;
