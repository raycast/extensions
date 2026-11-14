import { Material, Model, Section, Node, Member } from "./types";
export type Template = "simple" | "continuous" | "cantilever" | "fixed" | "propped" | "inclined" | "roof" | "truss";
export interface AnalysisInput {
  template: Template;
  spans: number[];
  pitch: number;
  section: Section;
  material: Material;
  E?: number;
  G?: number;
  density?: number;
  axis: "y" | "z";
  q: number;
  direction: "globalX" | "globalZ" | "localZ";
  basis: "member" | "projected";
  theory: "euler" | "timoshenko";
  shearArea?: number;
  supports?: string;
  tie: boolean;
  ridgeHinge: boolean;
  selfWeight: boolean;
  leftOverhang: number;
  rightOverhang: number;
  point?: {
    member: string;
    value: number;
    position?: number;
    ratio?: number;
    horizontal?: number;
  };
  jointLoad?: number;
}
export const templateNames: Record<Template, string> = {
  simple: "Simply supported",
  continuous: "Continuous, up to 5 spans",
  cantilever: "Cantilever",
  fixed: "Fixed–fixed",
  propped: "Propped cantilever",
  inclined: "Inclined beam",
  roof: "Rafter frame",
  truss: "Triangular axial truss",
};
export function support(code: string): [boolean, boolean, boolean] {
  switch (code.trim().toLowerCase()) {
    case "pin":
    case "pinned":
      return [true, true, false];
    case "roller":
      return [false, true, false];
    case "fixed":
      return [true, true, true];
    case "free":
      return [false, false, false];
    case "xroller":
      return [true, false, false];
    default:
      throw Error(`Unknown support ${code}. Use pin, roller, fixed, free or xroller.`);
  }
}
export function buildModel(i: AnalysisInput): Model {
  const E = i.E ?? i.material.E,
    G = i.G ?? i.material.G,
    rho = i.density ?? i.material.density;
  if (!(E! > 0)) throw Error("Choose a material with E or enter custom E");
  if (G !== null && G !== undefined && (!Number.isFinite(G) || G <= 0)) throw Error("G must be positive");
  if (rho !== null && rho !== undefined && (!Number.isFinite(rho) || rho <= 0)) throw Error("Density must be positive");
  if (i.shearArea !== undefined && (!Number.isFinite(i.shearArea) || i.shearArea <= 0))
    throw Error("Effective shear area must be positive");
  if (i.spans.length < 1 || i.spans.length > 5 || i.spans.some((v) => !Number.isFinite(v) || v <= 0))
    throw Error("Enter 1–5 positive spans in metres");
  if (!Number.isFinite(i.pitch) || Math.abs(i.pitch) >= 89) throw Error("Pitch must be between −89° and 89°");
  if (!Number.isFinite(i.q)) throw Error("Enter a finite load");
  if (i.leftOverhang < 0 || i.rightOverhang < 0) throw Error("Overhang lengths cannot be negative");
  if (Math.abs(i.section.Iyz) > 1e-6 * i.section.Iy)
    throw Error(
      "This asymmetric section has coupled bending. Choose a symmetric section or use explicit principal-axis properties in the advanced model.",
    );
  const nodes: Node[] = [],
    members: Member[] = [],
    model: Model = {
      nodes,
      members,
      nodalLoads: [],
      memberLoads: [],
      theory: i.theory,
    };
  const props = {
    section: i.section,
    bendingAxis: i.axis,
    E: E!,
    G: G ?? undefined,
    A: i.section.A,
    I: i.axis === "y" ? i.section.Iy : i.section.Iz,
    shearArea: i.shearArea ?? (i.axis === "y" ? i.section.Az : i.section.Ay),
  };
  // Rectangle kappa=5/6, circle kappa=6/7 are explicit defaults; other sections require catalogue/user shear area.
  if (!props.shearArea && i.section.shape === "rectangle") props.shearArea = (5 * i.section.A) / 6;
  if (!props.shearArea && i.section.shape === "circle") props.shearArea = (6 * i.section.A) / 7;
  const add = (a: string, b: string, type: "frame" | "truss" = "frame", extra: Partial<Member> = {}) =>
    members.push({
      id: "M" + (members.length + 1),
      start: a,
      end: b,
      type,
      ...props,
      ...extra,
    });
  const roof = i.template === "roof" || i.template === "truss";
  if (roof) {
    if (i.spans.length !== 1) throw Error("Roof/truss: enter one total horizontal span");
    if (i.pitch <= 0) throw Error("Roof/truss pitch must be positive");
    if (i.leftOverhang || i.rightOverhang) throw Error("Roof overhangs can be added in the advanced model");
    const L = i.spans[0] * 1000;
    nodes.push(
      { id: "A", x: 0, z: 0, restraints: support("pin") },
      {
        id: "B",
        x: L / 2,
        z: (L / 2) * Math.tan((i.pitch * Math.PI) / 180),
        restraints: support("free"),
      },
      {
        id: "C",
        x: L,
        z: 0,
        restraints: support(i.tie || i.template === "truss" ? "roller" : "pin"),
      },
    );
    const type = i.template === "truss" ? "truss" : "frame";
    add("A", "B", type, {
      releaseStart: i.ridgeHinge,
      releaseEnd: i.ridgeHinge,
    });
    add("B", "C", type, {
      releaseStart: i.ridgeHinge,
      releaseEnd: i.ridgeHinge,
    });
    if (i.tie || i.template === "truss") add("A", "C", "truss");
    if (i.template === "truss")
      model.nodalLoads.push({
        node: "B",
        fx: i.direction === "globalX" ? (i.jointLoad ?? 0) : 0,
        fz: i.direction === "globalX" ? 0 : (i.jointLoad ?? 0),
        moment: 0,
      });
  } else {
    const single = !["continuous", "inclined"].includes(i.template);
    if (single && i.spans.length !== 1)
      throw Error("This template uses one span; choose Continuous for multiple spans");
    const slope = Math.tan((i.pitch * Math.PI) / 180);
    let x = 0;
    if (i.leftOverhang)
      nodes.push({
        id: "L",
        x: -i.leftOverhang * 1000,
        z: -i.leftOverhang * 1000 * slope,
        restraints: support("free"),
      });
    for (let j = 0; j <= i.spans.length; j++) {
      const end = j === i.spans.length;
      let code = j === 0 ? "pin" : end ? "roller" : "roller";
      if (i.template === "fixed") code = j === 0 || end ? "fixed" : "roller";
      if (i.template === "cantilever") code = j === 0 ? "fixed" : "free";
      if (i.template === "propped") code = j === 0 ? "fixed" : "roller";
      nodes.push({
        id: String.fromCharCode(65 + j),
        x,
        z: x * slope,
        restraints: support(code),
      });
      if (j < i.spans.length) x += i.spans[j] * 1000;
    }
    if (i.rightOverhang)
      nodes.push({
        id: "R",
        x: x + i.rightOverhang * 1000,
        z: (x + i.rightOverhang * 1000) * slope,
        restraints: support("free"),
      });
    for (let j = 0; j < nodes.length - 1; j++) add(nodes[j].id, nodes[j + 1].id);
  }
  if (i.supports?.trim()) {
    const codes = i.supports.split("/");
    if (codes.length !== nodes.length)
      throw Error(`Enter ${nodes.length} support codes (${nodes.map((n) => n.id).join("/")})`);
    nodes.forEach((n, j) => (n.restraints = support(codes[j])));
  }
  if (i.template === "truss" && i.q !== 0)
    throw Error("True truss: use the joint load; distributed loads need frame/rafter members.");
  for (const m of members) {
    if (m.type === "frame" && i.q !== 0)
      model.memberLoads.push({
        member: m.id,
        kind: "udl",
        magnitude: i.q,
        direction: i.direction,
        basis: i.basis,
      });
    if (i.selfWeight) {
      if (!(rho! > 0)) throw Error("Self-weight needs a positive density");
      const weight = (rho! * m.A * 1e-6 * 9.80665) / 1000;
      if (m.type === "truss") {
        const a = nodes.find((n) => n.id === m.start)!,
          b = nodes.find((n) => n.id === m.end)!,
          F = (-weight * Math.hypot(b.x - a.x, b.z - a.z)) / 2;
        model.nodalLoads.push({ node: a.id, fx: 0, fz: F, moment: 0 }, { node: b.id, fx: 0, fz: F, moment: 0 });
      } else
        model.memberLoads.push({
          member: m.id,
          kind: "udl",
          magnitude: -weight,
          direction: "globalZ",
          basis: "member",
        });
    }
  }
  if (i.template === "truss" && i.direction === "localZ" && i.jointLoad)
    throw Error("Truss joint loads use global directions. Choose global down or global X.");
  if (i.point) {
    const m = members.find((m) => m.id === i.point!.member);
    if (!m) throw Error("Choose a valid target span or rafter");
    if (m.type === "truss")
      throw Error("True truss: apply a joint load or choose a rafter frame for between-joint loads");
    const a = nodes.find((n) => n.id === m.start)!,
      b = nodes.find((n) => n.id === m.end)!,
      L = Math.hypot(b.x - a.x, b.z - a.z) / 1000;
    const position =
      i.point.ratio !== undefined
        ? i.point.ratio * L
        : i.point.horizontal !== undefined
          ? i.point.horizontal / Math.abs((b.x - a.x) / (L * 1000))
          : (i.point.position ?? L / 2);
    if (!Number.isFinite(position) || position < 0 || position > L)
      throw Error("Point position must be within the selected member");
    model.memberLoads.push({
      member: i.point.member,
      kind: "point",
      magnitude: i.point.value,
      direction: i.direction,
      basis: "member",
      position: position * 1000,
    });
  }
  return model;
}
