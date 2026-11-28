import { Model, Result, Section, Material } from "./types";
import { shearProfile } from "./stresses";
import { analyze } from "./engine";
import { customSection } from "./sections";
export function energyShearArea(s: Section, axis: "y" | "z" = "y") {
  const given = axis === "y" ? s.Az : s.Ay;
  if (given && given > 0) return { value: given, source: "Catalogue/user effective shear area" };
  if (s.shape === "rectangle") return { value: (5 * s.A) / 6, source: "Rectangle: κ = 5/6" };
  if (s.shape === "circle") return { value: (6 * s.A) / 7, source: "Solid circle: κ = 6/7" };
  const keys: Record<string, number[]> = {
    rhs: [s.h, s.b, s.t],
    shs: [s.h, s.t],
    chs: [s.d, s.t],
    i: [s.h, s.b, s.tw, s.tf],
    channel: [s.h, s.b, s.tw, s.tf],
    angle: [s.h, s.b, s.tw, s.tf],
    t: [s.h, s.b, s.tw, s.tf],
  };
  const ideal = customSection(s.shape, keys[s.shape]);
  const p = shearProfile(ideal, axis),
    I = axis === "y" ? ideal.Iy : ideal.Iz;
  let integral = 0;
  for (let i = 1; i < p.points.length; i++) {
    const a = p.points[i - 1],
      b = p.points[i];
    const f = (v: typeof a) => (v.width > 1e-10 ? (v.Q * v.Q) / v.width : 0);
    integral += ((b.z - a.z) * (f(a) + f(b))) / 2;
  }
  return {
    value: (I * I) / integral,
    source: "Energy shear area from idealized VQ/(Ib); fillets/thin-wall flow approximated",
  };
}
export type DeformationParts = NonNullable<Result["deformation"]>;
export function withShearProperties(model: Model) {
  return {
    ...model,
    members: model.members.map((m) => ({
      ...m,
      shearArea:
        m.shearArea ||
        (m.section &&
        Math.abs(m.I - (m.bendingAxis === "z" ? m.section.Iz : m.section.Iy)) < 1e-6 * m.I &&
        Math.abs(m.A - m.section.A) < 1e-6 * m.A
          ? energyShearArea(m.section, m.bendingAxis).value
          : undefined),
    })),
  };
}
/** Compare at ONE station: sums of independently located maxima are not additive. */
export function deformationParts(model: Model): DeformationParts | undefined {
  if (
    !model.members.some((m) => m.type === "frame") ||
    model.members.some((m) => m.type === "frame" && !(m.G! > 0 && m.shearArea! > 0))
  )
    return;
  const first = analyze({ ...model, theory: "euler" });
  const t = analyze(
    { ...model, theory: "timoshenko" },
    Object.fromEntries(first.members.map((m) => [m.id, m.stations.map((s) => s.x)])),
  );
  // Recover the exact Euler displacement at every Timoshenko station, including
  // both theories' extrema. Interpolating a cubic is not exact for distributed loads.
  const e = analyze(
    { ...model, theory: "euler" },
    Object.fromEntries(t.members.map((m) => [m.id, m.stations.map((s) => s.x)])),
  );
  const curves = t.members.map((m) => {
    const bending = new Map(e.members.find((b) => b.id === m.id)!.stations.map((s) => [s.x, s.v]));
    return {
      member: m.id,
      stations: m.stations.map((s) => ({
        x: s.x,
        bending: bending.get(s.x)!,
        increment: s.v - bending.get(s.x)!,
        total: s.v,
      })),
    };
  });
  const peak = curves
    .flatMap((m) => m.stations.map((s) => ({ ...s, member: m.member })))
    .reduce((a, b) => (Math.abs(a.total) > Math.abs(b.total) ? a : b));
  return {
    ...peak,
    curves,
    description:
      "Euler bending + Timoshenko−Euler increment at matching local transverse stations. In indeterminate systems the increment also includes force redistribution. Forces and reactions use the selected beam theory.",
  };
}
