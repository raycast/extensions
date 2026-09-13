import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { measure } from "./chrome";

export default function Command() {
  const { data, error, isLoading } = usePromise(measure, []);

  let md: string;
  if (error) {
    md = `# Measurement failed\n\n${error.message}`;
  } else if (!data) {
    md = "Measuring…";
  } else {
    const outerW = data.bounds.x2 - data.bounds.x1;
    const outerH = data.bounds.y2 - data.bounds.y1;
    const zoomOk = Math.abs(data.dpr - Math.round(data.dpr)) <= 0.01;
    md = [
      "# Current Chrome Window",
      "",
      `**Viewport:** ${data.inner.w}×${data.inner.h} CSS px`,
      `**Outer window:** ${outerW}×${outerH} at (${data.bounds.x1}, ${data.bounds.y1})`,
      `**Chrome UI delta:** +${outerW - data.inner.w} wide / +${outerH - data.inner.h} tall`,
      `**devicePixelRatio:** ${data.dpr} — zoom ${zoomOk ? "100% ✓" : "NOT 100%, press ⌘0"}`,
      `**Display visible frame:** ${data.avail.w}×${data.avail.h} at (${data.avail.left}, ${data.avail.top})`,
    ].join("\n\n");
  }

  return <Detail isLoading={isLoading} markdown={md} />;
}
