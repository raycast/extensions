import { Model, Result, Section, Member } from "./types";
export interface StressPeak {
  value: number;
  member: string;
  x: number;
  fibre: number;
}
export interface StressResult {
  axial: StressPeak;
  bending: StressPeak;
  tension: StressPeak;
  compression: StressPeak;
  shear: StressPeak;
  vonMises: StressPeak;
  notes: string[];
}
type Strip = [number, number, number, number]; // width, lower coordinate, upper coordinate, signed area multiplier
/** Exact Q and slice width for idealized geometry; fillets are deliberately not guessed. */
export function shearProfile(section: Section, axis: "y" | "z" = "y") {
  const s = section,
    centroid = axis === "y" ? s.cz : s.cy,
    height = axis === "y" ? s.h : s.b;
  const strips: Strip[] = [];
  const rectangle = (width: number, depth: number, y: number, z: number, sign = 1) =>
    strips.push(axis === "y" ? [width, z, z + depth, sign] : [depth, y, y + width, sign]);
  if (["rectangle", "rhs", "shs"].includes(s.shape)) {
    rectangle(s.b, s.h, 0, 0);
    if (s.shape !== "rectangle") rectangle(s.b - 2 * s.t, s.h - 2 * s.t, s.t, s.t, -1);
  }
  if (["i", "channel"].includes(s.shape)) {
    rectangle(s.b, s.tf, 0, 0);
    rectangle(s.b, s.tf, 0, s.h - s.tf);
    rectangle(s.tw, s.h - 2 * s.tf, s.shape === "i" ? (s.b - s.tw) / 2 : 0, s.tf);
  }
  if (s.shape === "t") {
    rectangle(s.b, s.tf, 0, s.h - s.tf);
    rectangle(s.tw, s.h - s.tf, (s.b - s.tw) / 2, 0);
  }
  if (s.shape === "angle") {
    rectangle(s.b, s.tf, 0, 0);
    rectangle(s.tw, s.h - s.tf, 0, s.tf);
  }
  function point(z: number) {
    if (s.shape === "circle" || s.shape === "chs") {
      const R = s.d / 2,
        r = s.shape === "chs" ? R - s.t : 0,
        y = z - centroid;
      const outer = Math.max(0, R * R - y * y),
        inner = Math.max(0, r * r - y * y);
      return {
        width: 2 * (Math.sqrt(outer) - Math.sqrt(inner)),
        Q: (2 / 3) * (outer ** 1.5 - inner ** 1.5),
      };
    }
    let width = 0,
      Q = 0;
    for (const [b, lo, hi, sign] of strips) {
      if (z > lo && z < hi) width += sign * b;
      const cut = Math.max(lo, Math.min(hi, z));
      Q += (sign * b * ((hi - centroid) ** 2 - (cut - centroid) ** 2)) / 2;
    }
    return { width, Q };
  }
  const coordinates = new Set([0, height, centroid]);
  for (let i = 1; i < 160; i++) coordinates.add((height * i) / 160);
  for (const [, lo, hi] of strips)
    for (const boundary of [lo, hi])
      for (const shift of [-1e-7, 1e-7])
        if (boundary + shift > 0 && boundary + shift < height) coordinates.add(boundary + shift);
  return {
    centroid,
    height,
    points: [...coordinates].sort((a, b) => a - b).map((z) => ({ z, ...point(z) })),
  };
}
const cache = new WeakMap<Result, StressResult | undefined>();
/** 2D homogeneous elastic beam stresses. No torsion, local plate effects or resistance check. */
export function sectionStresses(
  model: Model,
  result: Result,
  fallback?: Section,
  axis: "y" | "z" = "y",
): StressResult | undefined {
  if (cache.has(result)) return cache.get(result);
  const empty = (): StressPeak => ({ value: 0, member: "", x: 0, fibre: 0 });
  const out: StressResult = {
    axial: empty(),
    bending: empty(),
    tension: empty(),
    compression: empty(),
    shear: empty(),
    vonMises: empty(),
    notes: [],
  };
  let usable = 0;
  for (const r of result.members) {
    const m = model.members.find((m) => m.id === r.id)!,
      s = m.section || fallback;
    if (!s) continue;
    const memberAxis = m.bendingAxis || axis;
    if (
      ![s.A, s.Iy, s.Iz, s.b, s.h].every((n) => Number.isFinite(n) && n > 0) ||
      ![s.cy, s.cz].every(Number.isFinite)
    ) {
      out.notes.push(`${m.id}: incomplete section geometry; stresses omitted.`);
      continue;
    }
    if (
      Math.abs(m.A - s.A) > 1e-6 * Math.max(1, s.A) ||
      Math.abs(m.I - (memberAxis === "y" ? s.Iy : s.Iz)) > 1e-6 * Math.max(1, m.I)
    ) {
      out.notes.push(`${m.id}: section geometry does not match the member properties; stresses omitted.`);
      continue;
    }
    usable++;
    const profile = shearProfile(s, memberAxis);
    if (s.shape !== "rectangle" && s.shape !== "circle")
      out.notes.push(
        "Shear is VQ/(Ib) on idealized geometry; rolled fillets and detailed thin-wall shear flow are not resolved.",
      );
    const update = (key: keyof Omit<StressResult, "notes">, value: number, x: number, z: number) => {
      if (!Number.isFinite(value)) return;
      const current = out[key];
      if (
        key === "compression"
          ? value < current.value
          : key === "tension"
            ? value > current.value
            : Math.abs(value) > Math.abs(current.value)
      )
        out[key] = { value, member: r.id, x, fibre: z };
    };
    for (const station of r.stations) {
      const axial = station.N / m.A;
      update("axial", axial, station.x, profile.centroid);
      for (const p of profile.points) {
        const bending = m.type === "truss" ? 0 : (-station.M * (p.z - profile.centroid)) / m.I,
          normal = axial + bending;
        const tau = m.type === "truss" || p.width <= 1e-8 ? 0 : (station.V * p.Q) / (m.I * p.width);
        update("bending", bending, station.x, p.z);
        update("tension", normal, station.x, p.z);
        update("compression", normal, station.x, p.z);
        update("shear", tau, station.x, p.z);
        update("vonMises", Math.sqrt(normal * normal + 3 * tau * tau), station.x, p.z);
      }
    }
  }
  out.notes = [...new Set(out.notes)];
  const value = usable ? out : undefined;
  cache.set(result, value);
  return value;
}
