import {
  crossings,
  curveValue,
  DEFAULT_DURATION,
  formatNumber as n,
  physical,
  springValue,
  springWindow,
  type Curve,
  type Easing,
  type Output,
  type Stop,
} from "./model.ts";

const json = (value: unknown) => JSON.stringify(value, null, 2);
const stopCSS = (stops: Stop[]) =>
  `linear(${stops.map((s) => `${n(s.y)} ${n(s.x * 100)}%`).join(", ")})`;
const precision = "Numeric values preserve JavaScript precision.";
const durationNote =
  "Shape preserved. Duration is not in the input; the snippet uses 0.5s.";

export function sampled(e: Easing): {
  stops: Stop[];
  error: number;
  duration: number;
  note: string;
} {
  const duration =
    e.kind === "spring" ? springWindow(e).seconds : DEFAULT_DURATION;
  const cycles =
    e.kind === "spring" ? (e.omega0 * duration) / (2 * Math.PI) : 1;
  const count = Math.min(2048, Math.max(256, Math.ceil(cycles * 64)));
  const value = (t: number) =>
    e.kind === "spring"
      ? springValue(e, t * duration)
      : curveValue(e as Curve, t);
  const stops = Array.from({ length: count + 1 }, (_, i) => ({
    x: i / count,
    y: value(i / count),
  }));
  let error = 0;
  for (let i = 0; i < count; i++)
    for (const f of [0.25, 0.5, 0.75]) {
      error = Math.max(
        error,
        Math.abs(
          value((i + f) / count) -
            (stops[i].y + (stops[i + 1].y - stops[i].y) * f),
        ),
      );
    }
  const truncated = e.kind === "spring" && springWindow(e).truncated;
  return {
    stops,
    error,
    duration,
    note: `${stops.length} samples; measured interpolation error ${(error * 100).toFixed(3)}% of travel (not a global bound).${e.kind === "spring" ? ` Tail cut at ${n(duration)}s${truncated ? "; this spring has not settled" : "; residual displacement below 0.1%"}.` : ""}`,
  };
}

function functionCode(curve: Curve): string {
  if (curve.kind === "steps") {
    const offset = ["jump-start", "jump-both"].includes(curve.position) ? 1 : 0;
    const denominator =
      curve.count +
      (curve.position === "jump-both"
        ? 1
        : curve.position === "jump-none"
          ? -1
          : 0);
    return `(t) => Math.min(1, Math.max(0, (Math.floor(t * ${curve.count}) + ${offset}) / ${denominator}))`;
  }
  if (curve.kind !== "linear") return "";
  return `(t) => {\n  const stops = ${json(curve.stops.map((s) => [Number(n(s.x)), Number(n(s.y))]))};\n  let i = 0;\n  while (i < stops.length - 1 && stops[i + 1][0] <= t) i++;\n  if (i === stops.length - 1) {\n    if (t === stops[i][0]) return stops[i][1];\n    i--;\n  }\n  const [x0, y0] = stops[i];\n  const [x1, y1] = stops[i + 1];\n  return x0 === x1 ? (t < x0 ? y0 : y1) : y0 + (y1 - y0) * (t - x0) / (x1 - x0);\n}`;
}

export function emit(e: Easing): Output[] {
  const outputs: Output[] = [];
  const add = (
    id: string,
    title: string,
    code: string | undefined,
    fidelity: Output["fidelity"],
    note: string,
    language = "text",
  ) => outputs.push({ id, title, code, fidelity, note, language });
  const figmaNote =
    "Figma paste-field syntax is unverified: both bare numbers and cubic-bezier() are offered.";
  let css: string,
    cssNote: string,
    cssFidelity: Output["fidelity"],
    duration = DEFAULT_DURATION;
  if (e.kind === "bezier") {
    const values = e.points.map(n).join(", ");
    css = `cubic-bezier(${values})`;
    cssNote = precision;
    cssFidelity = "Exact";
    add(
      "figma",
      "Figma · Numbers",
      values,
      "Exact",
      `${figmaNote} ${precision}`,
    );
    add("figma-css", "Figma · CSS Syntax", css, "Exact", figmaNote);
    add(
      "css-bezier",
      "CSS cubic-bezier",
      css,
      "Exact",
      `${precision}${e.points[1] < 0 || e.points[1] > 1 || e.points[3] < 0 || e.points[3] > 1 ? " Lottie clamps handles to 0–1 and cannot preserve these out-of-range handles." : ""}`,
      "css",
    );
    const s = sampled(e);
    add(
      "css-linear",
      "CSS linear()",
      stopCSS(s.stops),
      "Sampled",
      s.note,
      "css",
    );
    add(
      "motion",
      "Motion",
      `{ ease: [${values}] }`,
      "Exact",
      precision,
      "javascript",
    );
    add(
      "swiftui",
      "SwiftUI",
      `.timingCurve(${values}, duration: 0.5)`,
      "Exact",
      durationNote,
      "swift",
    );
    add(
      "compose",
      "Jetpack Compose",
      `CubicBezierEasing(${e.points.map((v) => `${n(v)}f`).join(", ")})`,
      "Exact",
      "Same control points; Compose uses Float precision.",
      "kotlin",
    );
    add(
      "tailwind",
      "Tailwind",
      `ease-[${css.replace(/ /g, "_")}]`,
      "Exact",
      "Timing function only; add your own duration.",
      "text",
    );
    add(
      "dtcg",
      "DTCG 2025.10",
      json({ easing: { $type: "cubicBezier", $value: e.points } }),
      "Exact",
      "Native DTCG cubicBezier token.",
      "json",
    );
    return outputs;
  }

  if (e.kind === "spring") {
    const p = physical(e),
      appleDuration = (2 * Math.PI) / e.omega0,
      bounce = 1 - e.zeta,
      appleBounce = e.zeta <= 1 ? 1 - e.zeta : 1 / e.zeta - 1;
    const window = springWindow(e),
      count = crossings(e, window.seconds);
    const rejection =
      count >= 2
        ? `${count} target crossings in ${n(window.seconds)}s. Not representable as one cubic-bezier. No approximation emitted.`
        : "A spring is not an exact cubic-bezier. No automatic Bézier approximation; use sampled CSS linear().";
    add(
      "figma",
      "Figma · Prototype",
      json({
        mass: e.mass,
        stiffness: p.stiffness,
        damping: p.damping,
        initialVelocity: e.initialVelocity,
      }),
      "Exact",
      "All four physical parameters preserved; runtime rest thresholds can differ.",
      "json",
    );
    add(
      "figma-motion",
      "Figma · Motion",
      e.zeta <= 1 ? json({ bounce }) : undefined,
      e.zeta <= 1 ? "Lossy" : "Unavailable",
      e.zeta <= 1
        ? "Bounce only. Discards natural frequency ω₀, mass and initial velocity; timing cannot be recovered."
        : "Overdamping cannot be encoded by a bounce-only value in 0–1.",
      "json",
    );
    add(
      "css-bezier",
      "CSS cubic-bezier",
      undefined,
      "Unavailable",
      rejection,
      "css",
    );
    const s = sampled(e);
    duration = s.duration;
    css = stopCSS(s.stops);
    cssNote = s.note;
    cssFidelity = "Sampled";
    add(
      "css-linear",
      "CSS linear()",
      `transition-timing-function: ${css};\ntransition-duration: ${n(duration)}s;`,
      "Sampled",
      cssNote,
      "css",
    );
    add(
      "motion",
      "Motion",
      `{ type: "spring", mass: ${n(e.mass)}, stiffness: ${n(p.stiffness)}, damping: ${n(p.damping)}, velocity: ${n(e.initialVelocity)} }`,
      "Exact",
      `Physical response preserved. ${precision} Rest thresholds can differ.`,
      "javascript",
    );
    // Motion visualDuration = Apple's duration / 1.2; bounce is clamped by Motion.
    const canUseVisual = e.zeta >= 0.05 && e.zeta <= 1;
    add(
      "motion-time",
      "Motion · Visual Duration",
      canUseVisual
        ? `{ type: "spring", visualDuration: ${n(appleDuration / 1.2)}, bounce: ${n(bounce)} }`
        : undefined,
      canUseVisual
        ? e.initialVelocity === 0
          ? "Exact"
          : "Lossy"
        : "Unavailable",
      canUseVisual
        ? `Apple period / 1.2. Mass normalized to 1.${e.initialVelocity !== 0 ? " Initial velocity discarded." : " Same response from rest."} Runtime termination may differ.`
        : "Motion's bounce clamp cannot preserve this damping ratio; use physics parameters.",
      "javascript",
    );
    const swift =
      e.initialVelocity === 0 &&
      e.mass === 1 &&
      appleBounce > -1 &&
      appleBounce <= 1 &&
      appleDuration >= 0.001 &&
      appleDuration <= 60
        ? `.spring(duration: ${n(appleDuration)}, bounce: ${n(appleBounce)})`
        : `.interpolatingSpring(mass: ${n(e.mass)}, stiffness: ${n(p.stiffness)}, damping: ${n(p.damping)}, initialVelocity: ${n(e.initialVelocity)})`;
    add(
      "swiftui",
      "SwiftUI",
      e.zeta > 1 && swift.startsWith(".interpolatingSpring")
        ? undefined
        : swift,
      e.zeta > 1 && swift.startsWith(".interpolatingSpring")
        ? "Unavailable"
        : "Exact",
      e.zeta > 1 && swift.startsWith(".interpolatingSpring")
        ? "Overdamped physical SwiftUI response is not verified: Apple's Spring physical initializer clamps damping. No exact Animation.interpolatingSpring equivalence is claimed; use another destination."
        : "Same physical response. Apple duration denotes the undamped period; runtime settling can differ.",
      "swift",
    );
    add(
      "compose",
      "Jetpack Compose",
      `spring<Float>(\n  dampingRatio = ${n(e.zeta)}f,\n  stiffness = ${n(p.stiffness / e.mass)}f\n)`,
      e.initialVelocity === 0 ? "Exact" : "Lossy",
      `Compose has no mass: stiffness normalized as k/m.${e.initialVelocity !== 0 ? ` Initial velocity ${n(e.initialVelocity)} is not in this spec; pass it separately to the animation API.` : " Same normalized response from rest."} Float precision and rest thresholds differ.`,
      "kotlin",
    );
    add(
      "tailwind",
      "Tailwind",
      `ease-[${css.replace(/ /g, "_")}] duration-[${n(duration)}s]`,
      "Sampled",
      cssNote,
    );
    add(
      "dtcg",
      "DTCG 2025.10",
      json({
        duration: {
          $type: "duration",
          $value: { value: appleDuration, unit: "s" },
          $description:
            "Undamped spring period. Spring dynamics are not encoded.",
        },
      }),
      "Lossy",
      "DTCG 2025.10 has no spring type. Only the undamped period is exported; damping, mass, velocity and spring behavior are lost.",
      "json",
    );
    return outputs;
  }

  css =
    e.kind === "linear" ? stopCSS(e.stops) : `steps(${e.count}, ${e.position})`;
  cssFidelity = "Exact";
  cssNote = `${e.kind === "linear" ? "Piecewise-linear stops and jumps preserved." : "Step count and jump convention preserved."} ${precision}`;
  add(
    "figma",
    "Figma",
    undefined,
    "Unavailable",
    "Figma's four-control-point field cannot encode arbitrary stops or steps.",
  );
  add(
    "css-bezier",
    "CSS cubic-bezier",
    undefined,
    "Unavailable",
    "Arbitrary stops or steps cannot be losslessly collapsed to a single Bézier.",
    "css",
  );
  add(
    "css-linear",
    e.kind === "steps" ? "CSS steps()" : "CSS linear()",
    css,
    cssFidelity,
    cssNote,
    "css",
  );
  add(
    "motion",
    "Motion",
    `{ ease: ${functionCode(e)} }`,
    "Exact",
    "Custom easing function preserves the piecewise response over 0–1.",
    "javascript",
  );
  // A native CustomAnimation preserves arbitrary stops without pretending they are Béziers.
  const expression =
    e.kind === "steps"
      ? `min(1, max(0, (floor(t * ${e.count}) + ${["jump-start", "jump-both"].includes(e.position) ? 1 : 0}) / ${e.count + (e.position === "jump-both" ? 1 : e.position === "jump-none" ? -1 : 0)}))`
      : "sample(t)";
  const swiftSample =
    e.kind === "linear"
      ? `\n  func sample(_ t: Double) -> Double {\n    let stops: [(Double, Double)] = [${e.stops.map((s) => `(${n(s.x)}, ${n(s.y)})`).join(", ")}]\n    var i = 0\n    while i < stops.count - 1 && stops[i + 1].0 <= t { i += 1 }\n    if i == stops.count - 1 {\n      if t == stops[i].0 { return stops[i].1 }\n      i -= 1\n    }\n    let (x0, y0) = stops[i]\n    let (x1, y1) = stops[i + 1]\n    return x0 == x1 ? (t < x0 ? y0 : y1) : y0 + (y1 - y0) * (t - x0) / (x1 - x0)\n  }\n`
      : "";
  const endpoints = curveValue(e, 0) === 0 && curveValue(e, 1) === 1;
  add(
    "swiftui",
    "SwiftUI",
    `import SwiftUI\n\n// iOS 17+ / macOS 14+\nstruct RosettaEasing: CustomAnimation {\n  var duration: Double = 0.5\n  func animate<V: VectorArithmetic>(value: V, time: TimeInterval, context: inout AnimationContext<V>) -> V? {\n    guard duration > 0, time <= duration else { return nil }\n    let t = max(0, time / duration)\n    return value.scaled(by: ${expression})\n  }\n${swiftSample}}\n\n// Usage: Animation(RosettaEasing())`,
    endpoints ? "Exact" : "Lossy",
    `${durationNote} Requires CustomAnimation (iOS 17+/macOS 14+).${endpoints ? "" : " SwiftUI completes at the target; nonstandard endpoint jumps cannot persist after completion."}`,
    "swift",
  );
  const kotlin =
    e.kind === "steps"
      ? `Easing { t ->\n  ((kotlin.math.floor(t * ${e.count}) + ${["jump-start", "jump-both"].includes(e.position) ? "1f" : "0f"}) / ${e.count + (e.position === "jump-both" ? 1 : e.position === "jump-none" ? -1 : 0)}f).coerceIn(0f, 1f)\n}`
      : `Easing { t ->\n  val stops = listOf(${e.stops.map((s) => `${n(s.x)}f to ${n(s.y)}f`).join(", ")})\n  var i = 0\n  while (i < stops.lastIndex && stops[i + 1].first <= t) i++\n  if (i == stops.lastIndex && t == stops[i].first) {\n    stops[i].second\n  } else {\n    if (i == stops.lastIndex) i--\n    val (x0, y0) = stops[i]\n    val (x1, y1) = stops[i + 1]\n    if (x0 == x1) { if (t < x0) y0 else y1 }\n    else y0 + (y1 - y0) * (t - x0) / (x1 - x0)\n  }\n}`;
  add(
    "compose",
    "Jetpack Compose",
    kotlin,
    "Exact",
    "Custom Easing preserves segments and jumps over 0–1; Float precision applies.",
    "kotlin",
  );
  add(
    "tailwind",
    "Tailwind",
    `ease-[${css.replace(/ /g, "_")}]`,
    "Exact",
    "Timing function only; add your own duration.",
  );
  add(
    "dtcg",
    "DTCG 2025.10",
    undefined,
    "Unavailable",
    "DTCG has no arbitrary linear-stop or step token, and the input contains no duration to export.",
    "json",
  );
  return outputs;
}
