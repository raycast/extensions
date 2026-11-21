import { numberField } from "./csv";
import { RecordRow, Section, Shape } from "./types";
export function sectionFromRow(raw: RecordRow): Section {
  const n = (k: string) => numberField(raw, k) ?? 0;
  const shape = (raw.shape || "rectangle") as Shape;
  const b = n("b"),
    h = n("h"),
    t = n("t"),
    tw = n("tw"),
    tf = n("tf"),
    d = n("d");
  if (!["rectangle", "circle", "rhs", "shs", "chs", "i", "t", "channel", "angle"].includes(shape))
    throw Error(`${raw.id}: unknown shape ${shape}`);
  let A = 0,
    Iy = 0,
    Iz = 0,
    Iyz = 0,
    cy = b / 2,
    cz = h / 2,
    J: number | undefined,
    Wply: number | undefined,
    Wplz: number | undefined;
  let height = h,
    width = b;
  const positive = (...v: number[]) => {
    if (v.some((x) => !(x > 0))) throw Error(`${raw.id}: dimensions must be positive`);
  };
  const rectJ = (B: number, H: number) => {
    const a = Math.max(B, H),
      bb = Math.min(B, H);
    return a * bb ** 3 * (1 / 3 - 0.21 * (bb / a) * (1 - bb ** 4 / (12 * a ** 4)));
  };
  if (shape === "circle" || shape === "chs") {
    positive(d);
    const inner = shape === "chs" ? d - 2 * t : 0;
    if (shape === "chs") {
      positive(t);
      if (inner <= 0) throw Error("CHS thickness must be less than half the diameter");
    }
    A = (Math.PI * (d * d - inner * inner)) / 4;
    Iy = Iz = (Math.PI * (d ** 4 - inner ** 4)) / 64;
    J = 2 * Iy;
    Wply = Wplz = (d ** 3 - inner ** 3) / 6;
    cy = cz = d / 2;
    height = width = d;
  } else if (["rectangle", "rhs", "shs"].includes(shape)) {
    const B = shape === "shs" ? h : b;
    positive(B, h);
    width = B;
    cy = B / 2;
    const bi = shape === "rectangle" ? 0 : B - 2 * t,
      hi = shape === "rectangle" ? 0 : h - 2 * t;
    if (shape !== "rectangle") {
      positive(t, bi, hi);
    }
    A = B * h - bi * hi;
    Iy = (B * h ** 3 - bi * hi ** 3) / 12;
    Iz = (h * B ** 3 - hi * bi ** 3) / 12;
    Wply = (B * h * h - bi * hi * hi) / 4;
    Wplz = (h * B * B - hi * bi * bi) / 4;
    if (shape === "rectangle") J = rectJ(B, h);
    else J = (4 * ((B - t) * (h - t)) ** 2) / ((2 * (B + h - 2 * t)) / t);
  } else {
    positive(b, h, tw, tf);
    if (tw >= b || tf >= h || (["i", "channel"].includes(shape) && 2 * tf >= h))
      throw Error("Invalid web/flange geometry");
    // Non-overlapping rectangles: [width,height,centroid y,centroid z].
    let pieces: number[][] = [];
    if (shape === "i")
      pieces = [
        [b, tf, b / 2, tf / 2],
        [b, tf, b / 2, h - tf / 2],
        [tw, h - 2 * tf, b / 2, h / 2],
      ];
    if (shape === "t")
      pieces = [
        [b, tf, b / 2, h - tf / 2],
        [tw, h - tf, b / 2, (h - tf) / 2],
      ];
    if (shape === "channel")
      pieces = [
        [b, tf, b / 2, tf / 2],
        [b, tf, b / 2, h - tf / 2],
        [tw, h - 2 * tf, tw / 2, h / 2],
      ];
    if (shape === "angle")
      pieces = [
        [b, tf, b / 2, tf / 2],
        [tw, h - tf, tw / 2, tf + (h - tf) / 2],
      ];
    A = pieces.reduce((s, [B, H]) => s + B * H, 0);
    cy = pieces.reduce((s, [B, H, Y]) => s + B * H * Y, 0) / A;
    cz = pieces.reduce((s, [B, H, , Z]) => s + B * H * Z, 0) / A;
    for (const [B, H, Y, Z] of pieces) {
      Iy += (B * H ** 3) / 12 + B * H * (Z - cz) ** 2;
      Iz += (H * B ** 3) / 12 + B * H * (Y - cy) ** 2;
      Iyz += B * H * (Y - cy) * (Z - cz);
    }
    J = pieces.reduce((s, [B, H]) => s + rectJ(B, H), 0);
    if (shape === "i") {
      Wply = b * tf * (h - tf) + (tw * (h - 2 * tf) ** 2) / 4;
      Wplz = (2 * tf * b * b) / 4 + ((h - 2 * tf) * tw * tw) / 4;
    }
  }
  A = numberField(raw, "A") ?? A;
  Iy = numberField(raw, "Iy") ?? Iy;
  Iz = numberField(raw, "Iz") ?? Iz;
  Iyz = numberField(raw, "Iyz") ?? Iyz;
  cy = numberField(raw, "cy") ?? cy;
  cz = numberField(raw, "cz") ?? cz;
  positive(A, Iy, Iz);
  if (Iy * Iz - Iyz * Iyz <= 0) throw Error(`${raw.id}: invalid inertia tensor`);
  const avg = (Iy + Iz) / 2,
    rad = Math.hypot((Iy - Iz) / 2, Iyz);
  const catalogue = Boolean(numberField(raw, "Iy"));
  return {
    id: raw.id,
    family: raw.family || "Custom",
    shape,
    b: width,
    h: height,
    t,
    tw,
    tf,
    d,
    A,
    Iy,
    Iz,
    Iyz,
    cy,
    cz,
    Wy: numberField(raw, "Wy") ?? Iy / Math.max(cz, height - cz),
    Wz: numberField(raw, "Wz") ?? Iz / Math.max(cy, width - cy),
    ry: Math.sqrt(Iy / A),
    rz: Math.sqrt(Iz / A),
    Imajor: avg + rad,
    Iminor: avg - rad,
    principalAngle: 0.5 * Math.atan2(-2 * Iyz, Iy - Iz),
    J: catalogue ? (numberField(raw, "J") ?? undefined) : J,
    Wply: catalogue ? (numberField(raw, "Wply") ?? undefined) : Wply,
    Wplz: catalogue ? (numberField(raw, "Wplz") ?? undefined) : Wplz,
    Ay: numberField(raw, "Ay") ?? undefined,
    Az: numberField(raw, "Az") ?? undefined,
    Iw: numberField(raw, "Iw") ?? undefined,
    mass: numberField(raw, "mass") ?? undefined,
    source: raw.source || "User geometry",
    notes:
      raw.notes ||
      (catalogue
        ? "Catalogue properties; drawing schematic"
        : "Idealized geometry; sharp corners. J is an engineering approximation."),
    raw,
  };
}
export function customSection(shape: Shape, dims: number[]): Section {
  const raw: RecordRow = {
    id: `${shape} ${dims.join("×")}`,
    family: "Custom",
    shape,
  };
  const keys: Record<Shape, string[]> = {
    rectangle: ["b", "h"],
    circle: ["d"],
    rhs: ["h", "b", "t"],
    shs: ["h", "t"],
    chs: ["d", "t"],
    i: ["h", "b", "tw", "tf"],
    t: ["h", "b", "tw", "tf"],
    channel: ["h", "b", "tw", "tf"],
    angle: ["h", "b", "tw", "tf"],
  };
  keys[shape].forEach((k, i) => (raw[k] = String(dims[i] ?? 0)));
  return sectionFromRow(raw);
}
