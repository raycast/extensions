export type Stop = { x: number; y: number };
export type Curve = (
  | { kind: "bezier"; points: [number, number, number, number] }
  | { kind: "linear"; stops: Stop[] }
  | {
      kind: "steps";
      count: number;
      position: "jump-start" | "jump-end" | "jump-none" | "jump-both";
    }
) & { duration?: number };
export type Spring = {
  kind: "spring";
  omega0: number;
  zeta: number;
  mass: number;
  initialVelocity: number;
};
export type Easing = Curve | Spring;
export type Parsed = {
  easing: Easing;
  format: string;
  notes: string[];
  inputLosses?: string[];
};
export type Output = {
  id: string;
  title: string;
  code?: string;
  fidelity: "Exact" | "Sampled" | "Lossy" | "Unavailable";
  note: string;
  language: string;
};
// Keep the shortest round-trippable representation. Fixed decimal rounding can
// turn valid small spring parameters into zero or merge distinct linear stops.
export const formatNumber = (n: number) => {
  if (!Number.isFinite(n))
    throw new Error("Cannot export a non-finite number.");
  return String(n);
};
export const DEFAULT_DURATION = 0.5;

export function fromDuration(
  duration: number,
  bounce: number,
  mass = 1,
  initialVelocity = 0,
): Spring {
  if (!Number.isFinite(bounce) || bounce <= -1 || bounce > 1)
    throw new Error("Apple bounce must be greater than -1 and at most 1.");
  return {
    kind: "spring",
    omega0: (2 * Math.PI) / duration,
    zeta: bounce >= 0 ? 1 - bounce : 1 / (1 + bounce),
    mass,
    initialVelocity,
  };
}

export function physical(s: Spring) {
  const stiffness = s.mass * s.omega0 ** 2;
  return {
    stiffness,
    damping: 2 * s.zeta * Math.sqrt(stiffness * s.mass),
    mass: s.mass,
    velocity: s.initialVelocity,
  };
}

export function springValue(s: Spring, time: number): number {
  const { omega0: w, zeta: z, initialVelocity: v } = s;
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return (
      1 +
      Math.exp(-z * w * time) *
        (-Math.cos(wd * time) + ((v - z * w) / wd) * Math.sin(wd * time))
    );
  }
  if (Math.abs(z - 1) < 1e-8)
    return 1 + (-1 + (v - w) * time) * Math.exp(-w * time);
  // Stable slow root avoids cancellation for heavily overdamped springs.
  const root = Math.sqrt(z * z - 1);
  const r1 = -w / (z + root),
    r2 = -w * (z + root);
  const a = (v + r2) / (r1 - r2);
  return 1 + a * Math.exp(r1 * time) + (-1 - a) * Math.exp(r2 * time);
}

export function springWindow(s: Spring): {
  seconds: number;
  truncated: boolean;
} {
  // A finite preview/export window; the mathematical spring has an infinite tail.
  // Bound displacement and normalized speed to 0.001 before cutting the tail.
  const w = s.omega0,
    z = s.zeta,
    v = s.initialVelocity;
  let seconds: number;
  if (z === 0) seconds = (12 * Math.PI) / w;
  else if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    const envelope = Math.hypot(1, (v - z * w) / wd);
    seconds = Math.log(Math.max(1, envelope) * 2000) / (z * w);
  } else {
    seconds = 1 / w;
    while (
      seconds < 60 &&
      (Math.abs(1 - springValue(s, seconds)) > 0.0005 ||
        Math.abs(springValue(s, seconds + 0.0001) - springValue(s, seconds)) /
          0.0001 /
          w >
          0.0005)
    )
      seconds *= 1.25;
  }
  return {
    seconds: Math.min(60, Math.max(0.001, seconds)),
    truncated: z === 0 || seconds > 60,
  };
}

export function crossings(s: Spring, seconds: number): number {
  if (s.zeta >= 1) {
    // Critical/overdamped motion can still cross once with a large initial velocity.
    return springValue(s, seconds) > 1 ? 1 : 0;
  }
  const wd = s.omega0 * Math.sqrt(1 - s.zeta ** 2);
  const b = (s.initialVelocity - s.zeta * s.omega0) / wd;
  const phase = Math.atan2(b, -1);
  let first = (phase + Math.PI / 2) % Math.PI;
  if (first <= 0) first += Math.PI;
  return Math.max(0, Math.floor((seconds * wd - first) / Math.PI) + 1);
}

export function linearValue(stops: Stop[], x: number): number {
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].x <= x) i++;
  if (i === stops.length - 1) {
    if (x === stops[i].x) return stops[i].y;
    i--;
  }
  const a = stops[i],
    b = stops[i + 1];
  return a.x === b.x
    ? x < a.x
      ? a.y
      : b.y
    : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
}

export function curveValue(curve: Curve, t: number): number {
  if (curve.kind === "linear") return linearValue(curve.stops, t);
  if (curve.kind === "steps") {
    const n = curve.count,
      p = curve.position;
    const offset = p === "jump-start" || p === "jump-both" ? 1 : 0;
    const denominator =
      n + (p === "jump-both" ? 1 : p === "jump-none" ? -1 : 0);
    return Math.min(1, Math.max(0, (Math.floor(t * n) + offset) / denominator));
  }
  const [x1, y1, x2, y2] = curve.points;
  const cubic = (u: number, a: number, b: number) =>
    3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
  let low = 0,
    high = 1;
  for (let i = 0; i < 36; i++) {
    const mid = (low + high) / 2;
    if (cubic(mid, x1, x2) < t) low = mid;
    else high = mid;
  }
  return t === 0 ? 0 : t === 1 ? 1 : cubic((low + high) / 2, y1, y2);
}

export function plotPoints(e: Easing, count = 240): Stop[] {
  if (e.kind === "linear") {
    return [
      { x: 0, y: linearValue(e.stops, 0) },
      ...e.stops.filter((s) => s.x >= 0 && s.x <= 1),
      { x: 1, y: linearValue(e.stops, 1) },
    ];
  }
  if (e.kind === "steps") {
    const points: Stop[] = [{ x: 0, y: curveValue(e, 0) }];
    for (let i = 1; i <= e.count; i++) {
      const x = i / e.count;
      points.push(
        { x, y: curveValue(e, x - 1e-9) },
        { x, y: curveValue(e, x) },
      );
    }
    return points;
  }
  const duration = e.kind === "spring" ? springWindow(e).seconds : 1;
  return Array.from({ length: count + 1 }, (_, i) => ({
    x: i / count,
    y:
      e.kind === "spring"
        ? springValue(e, (i / count) * duration)
        : curveValue(e, i / count),
  }));
}
