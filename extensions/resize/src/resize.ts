import { getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { measure, setBounds } from "./chrome";
import { openDeviceMode } from "./devtools";
import { Preset } from "./types";

export type ApplyResult =
  | {
      kind: "resized";
      achieved: { w: number; h: number };
      requested: { w: number; h: number };
      clamped: boolean;
    }
  | { kind: "info" };

export async function applyPreset(p: Preset): Promise<ApplyResult> {
  if (p.strategy === "info") return { kind: "info" };

  const m1 = await measure();

  // At zoom ≠ 100%, CSS px no longer equal points, so the chrome-delta math and
  // single correction step below would land on the wrong viewport. Measured from
  // points ÷ CSS-px (see Measurement.zoom) so it catches 150%/200%/50% too, which
  // devicePixelRatio alone cannot (those are integer DPRs indistinguishable from 100%).
  if (Math.abs(m1.zoom - 1) > 0.01) {
    throw new Error(`Chrome zoom is ${Math.round(m1.zoom * 100)}%, not 100% — press ⌘0 and retry`);
  }

  const chromeW = m1.bounds.x2 - m1.bounds.x1 - m1.inner.w;
  const chromeH = m1.bounds.y2 - m1.bounds.y1 - m1.inner.h;

  let outerW = p.viewport.w + chromeW;
  let outerH = p.viewport.h + chromeH;
  const clamped = outerW > m1.avail.w || outerH > m1.avail.h;
  outerW = Math.min(outerW, m1.avail.w);
  outerH = Math.min(outerH, m1.avail.h);

  // Keep the window's position, but pull it fully into the display's visible frame.
  const x1 = clampPos(m1.bounds.x1, m1.avail.left, m1.avail.left + m1.avail.w - outerW);
  const y1 = clampPos(m1.bounds.y1, m1.avail.top, m1.avail.top + m1.avail.h - outerH);

  await setBounds(x1, y1, x1 + outerW, y1 + outerH);

  let m2 = await measure();
  if (!clamped && (m2.inner.w !== p.viewport.w || m2.inner.h !== p.viewport.h)) {
    const dw = p.viewport.w - m2.inner.w;
    const dh = p.viewport.h - m2.inner.h;
    await setBounds(x1, y1, x1 + outerW + dw, y1 + outerH + dh);
    m2 = await measure();
  }

  return { kind: "resized", achieved: m2.inner, requested: p.viewport, clamped };
}

function clampPos(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

export async function applyAndNotify(p: Preset, prefix = ""): Promise<void> {
  const { phoneMode } = getPreferenceValues<{ phoneMode?: string }>();
  if (p.class === "phone" && phoneMode === "devtools") {
    await openDeviceMode(p.name, p.viewport);
    return;
  }

  try {
    const r = await applyPreset(p);
    if (r.kind === "info") {
      await showHUD(
        `${prefix}${p.name} — ${p.viewport.w}×${p.viewport.h} · ${p.warnings[0] ?? "not window-simulatable"}`,
      );
      return;
    }
    const exact = r.achieved.w === r.requested.w && r.achieved.h === r.requested.h;
    const suffix = exact
      ? "✓"
      : `(requested ${r.requested.w}×${r.requested.h}${r.clamped ? ", clamped to display" : ""})`;
    const caveat = p.pointer === "coarse" ? " · geometry only" : "";
    await showHUD(
      `${prefix}${p.name} — viewport ${r.achieved.w}×${r.achieved.h} ${suffix}${caveat}`,
    );
  } catch (e) {
    await showFailureToast(e, { title: "Resize failed" });
  }
}
