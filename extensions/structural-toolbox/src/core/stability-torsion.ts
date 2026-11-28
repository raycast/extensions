import { Material, Section } from "./types";

/** N, mm, MPa, radians throughout. No resistance or utilization checks. */
export interface EngineeringOptions {
  T?: number;
  G?: number;
  J?: number;
  Iw?: number;
  Wt?: number;
  Ww?: number;
  E05?: number;
  G05?: number;
  fy?: number;
  fc?: number;
  fm?: number;
  alphaY?: number;
  alphaZ?: number;
  alphaLT?: number;
  betaC?: number;
  Ky?: number;
  Kz?: number;
  C1?: number;
  C2?: number;
  zg?: number;
  kLT?: number;
  kw?: number;
  torqueCase?: number;
  ltbCase?: number;
  modulusBasis?: number;
  areaBasis?: number;
  material?: Material;
}
export const isTimber = (m?: Material) => !!m && /sawn|glulam|lvl|timber/i.test(m.family);
export const isSteel = (m?: Material) => !!m && /steel/i.test(m.family);
export function rawNumber(raw: Record<string, string>, ...keys: string[]) {
  for (const k of keys) {
    const t = raw[k];
    if (t !== undefined && t.trim() && Number.isFinite(Number(t))) return Number(t);
  }
  return undefined;
}
function positive(n: number | undefined, name: string): number {
  if (!(n! > 0) || !Number.isFinite(n)) throw Error(`Enter a positive ${name}`);
  return n!;
}
export function materialStrength(m: Material, o: EngineeringOptions = {}) {
  const nominal = /^Steel-S(235|275|355|460)$/i.exec(m.id);
  return {
    fy: o.fy ?? rawNumber(m.raw, "fy", "f_y"),
    nominalFy: nominal ? Number(nominal[1]) : undefined,
    fc: o.fc ?? rawNumber(m.raw, "fc0_k", "fc_0_k"),
    fm: o.fm ?? rawNumber(m.raw, "fm_k"),
    E05: o.E05 ?? rawNumber(m.raw, "E0_05"),
    G05: o.G05 ?? rawNumber(m.raw, "G_05", "G0_05"),
  };
}
export function steelReduction(lambda: number, alpha: number) {
  positive(alpha, "imperfection factor alpha");
  if (!(lambda >= 0) || !Number.isFinite(lambda)) throw Error("Invalid relative slenderness");
  if (lambda <= 0.2) return 1;
  const phi = (1 + alpha * (lambda - 0.2) + lambda * lambda) / 2;
  return Math.min(1, 1 / (phi + Math.sqrt(Math.max(0, phi * phi - lambda * lambda))));
}
export function timberReduction(lambda: number, beta: number) {
  positive(beta, "timber imperfection factor beta_c");
  if (!(lambda >= 0) || !Number.isFinite(lambda)) throw Error("Invalid relative slenderness");
  if (lambda <= 0.3) return 1;
  const k = (1 + beta * (lambda - 0.3) + lambda * lambda) / 2;
  return Math.min(1, 1 / (k + Math.sqrt(Math.max(0, k * k - lambda * lambda))));
}
export function timberLTBReduction(lambda: number) {
  if (!(lambda >= 0) || !Number.isFinite(lambda)) throw Error("Invalid relative slenderness");
  return lambda <= 0.75 ? 1 : lambda <= 1.4 ? 1.56 - 0.75 * lambda : 1 / lambda ** 2;
}
export interface FactorAxis {
  axis: string;
  inertia: number;
  length: number;
  Ncr: number;
  lambda: number;
  factor: number;
  imperfection: number;
}
export interface ColumnFactors {
  code: "EC3" | "EC5";
  axes: FactorAxis[];
  E: number;
  strength: number;
  area: number;
  notes: string[];
}
export function columnFactors(
  s: Section,
  m: Material,
  L: number,
  E: number,
  K = 1,
  o: EngineeringOptions = {},
): ColumnFactors | undefined {
  if (!isSteel(m) && !isTimber(m)) return undefined;
  positive(L, "member length");
  const p = materialStrength(m, o),
    timber = isTimber(m),
    notes: string[] = [];
  const strength = positive(
    timber ? p.fc : p.fy,
    timber ? "fc0,k (MPa)" : "fy (MPa), from the product/thickness specification",
  );
  const stiffness = positive(timber ? p.E05 : E, timber ? "E0,05 (MPa)" : "E (MPa)");
  const coupled = Math.abs(s.Iyz) > 1e-8 * Math.sqrt(s.Iy * s.Iz);
  const area =
    o.areaBasis === 1 ? positive(rawNumber(s.raw, "Aeff", "A_eff"), "effective area Aeff in the section CSV") : s.A;
  const axes: [string, number, number, number][] = [
    [coupled ? "u" : "y", coupled ? s.Imajor : s.Iy, o.Ky ?? K, o.alphaY ?? 0.34],
    [coupled ? "v" : "z", coupled ? s.Iminor : s.Iz, o.Kz ?? K, o.alphaZ ?? 0.34],
  ];
  const beta = o.betaC ?? (/glulam|lvl/i.test(m.family) ? 0.1 : 0.2);
  if (!timber)
    notes.push(
      `EC3 general flexural buckling; ${o.areaBasis === 1 ? "effective area (Class 4), supplied by user" : "gross area, Class 1–3 reference"}. Default curve b (alpha=0.34) is an editable assumption, not an automatic section classification.`,
    );
  else
    notes.push(
      "EC5 factors use E0,05; the Euler result above retains its displayed E. Beta_c depends on product and straightness conditions.",
    );
  if (coupled)
    notes.push("Principal u/v flexural modes only. Torsional and flexural-torsional column modes are not included.");
  return {
    code: timber ? "EC5" : "EC3",
    E: stiffness,
    strength,
    area,
    notes,
    axes: axes.map(([axis, I, k, alpha]) => {
      const length = positive(k, "effective-length factor") * L,
        Ncr = (Math.PI ** 2 * stiffness * I) / length ** 2;
      const lambda = Math.sqrt((area * strength) / Ncr);
      return {
        axis,
        inertia: I,
        length,
        Ncr,
        lambda,
        imperfection: timber ? beta : alpha,
        factor: timber ? timberReduction(lambda, beta) : steelReduction(lambda, alpha),
      };
    }),
  };
}

export function torsionProperties(s: Section, o: EngineeringOptions = {}) {
  const J = positive(o.J ?? rawNumber(s.raw, "J") ?? s.J, "torsion constant J (mm4)");
  let Iw = o.Iw ?? s.Iw;
  if (Iw === undefined && s.shape === "i" && !s.raw.A && !s.raw.Iy) Iw = (s.tf * s.b ** 3 * (s.h - s.tf) ** 2) / 24;
  return {
    J,
    Iw,
    Wt: o.Wt ?? rawNumber(s.raw, "Wt", "W_t"),
    Ww: o.Ww ?? rawNumber(s.raw, "Ww", "Womega", "W_omega"),
  };
}
export interface SVResult {
  tau?: number;
  rate: number;
  twist?: number;
  J: number;
  equation: string;
  method: string;
  notes: string[];
}
/** Exact isotropic rectangle series. Returns J and max stress / unit torque. */
export function rectangleTorsion(b: number, h: number) {
  const a = positive(Math.max(b, h), "rectangle long side"),
    c = positive(Math.min(b, h), "rectangle short side");
  let sum5 = 0,
    sum2 = 0;
  for (let n = 1; n < 801; n += 2) {
    sum5 += Math.tanh((n * Math.PI * a) / (2 * c)) / n ** 5;
    const z = (n * Math.PI * a) / (2 * c);
    sum2 += (2 * Math.exp(-z)) / (1 + Math.exp(-2 * z)) / n ** 2;
  }
  const J = ((a * c ** 3) / 3) * (1 - ((192 * c) / (Math.PI ** 5 * a)) * sum5);
  return { J, stressPerTorque: (c * (1 - (8 / Math.PI ** 2) * sum2)) / J };
}
export function stVenant(s: Section, G: number, T: number, L?: number, o: EngineeringOptions = {}): SVResult {
  positive(G, "G (MPa)");
  if (!Number.isFinite(T)) throw Error("Enter torque T");
  if (L !== undefined) positive(L, "length");
  const p = torsionProperties(s, o),
    notes: string[] = [];
  let J = p.J,
    tau: number | undefined,
    equation = "",
    method = "";
  if (p.Wt !== undefined) {
    tau = Math.abs(T) / positive(p.Wt, "torsional stress modulus Wt");
    equation = String.raw`\tau_{max}=\frac{|T|}{W_t}`;
    method = "Supplied torsional stress modulus";
    notes.push(
      "Wt must describe the maximum St. Venant shear stress for this section; J alone does not specify that stress.",
    );
  } else if (["circle", "chs"].includes(s.shape)) {
    tau = (Math.abs(T) * s.d) / 2 / J;
    equation = String.raw`\tau_{max}=\frac{|T|r_o}{J}`;
    method = "Circular section; exact elastic solution";
  } else if (s.shape === "rectangle") {
    const r = rectangleTorsion(s.b, s.h);
    if (o.J === undefined && !s.raw.J) J = r.J;
    // Stress follows the same twist rate as the selected J; geometry factor is independent of J.
    tau = (Math.abs(T) * r.stressPerTorque * r.J) / J;
    equation = String.raw`\tau_{max}=G\theta' b_s\left[1-\frac{8}{\pi^2}\sum_{n\;odd}\frac{\mathrm{sech}(n\pi b_l/2b_s)}{n^2}\right]`;
    method = "Solid rectangle; converged elastic series";
    notes.push(
      "Uniform scalar G is assumed. Orthotropic timber requires a suitable effective torsional shear modulus.",
      "In the rectangle series, bs is the shorter side and bl the longer side. Maximum shear occurs at the midpoint of a long side; J uses the same converged series unless explicitly supplied.",
    );
  } else if (["rhs", "shs"].includes(s.shape)) {
    if (s.t / Math.min(s.b, s.h) > 0.1)
      notes.push("Wall thickness exceeds 10% of the smallest outer dimension; thin-wall stress accuracy is limited.");
    const Am = (s.b - s.t) * (s.h - s.t);
    tau = Math.abs(T) / (2 * Am * s.t);
    equation = String.raw`\tau\approx\frac{|T|}{2A_m t}`;
    method = "Single-cell thin-wall Bredt approximation";
    notes.push("Sharp median-line geometry, uniform thickness; catalogue corner radii are omitted in stress recovery.");
  } else if (["i", "t", "channel", "angle"].includes(s.shape)) {
    tau = (Math.abs(T) * Math.max(s.tf, s.tw)) / J;
    equation = String.raw`\tau_{SV,max}\approx\frac{|T_{SV}|t_{max}}{J}`;
    method = "Open-section thin-strip approximation";
    notes.push("Plate surface stresses away from corners/fillets; local stress concentrations are excluded.");
  }
  return {
    tau,
    J,
    rate: T / (G * J),
    twist: L === undefined ? undefined : (T * L) / (G * J),
    equation,
    method,
    notes,
  };
}

export interface LTBResult {
  Mcr: number;
  E: number;
  G: number;
  J: number;
  Iw: number;
  C1: number;
  C2: number;
  zg: number;
  k: number;
  kw: number;
  length: number;
  lambda?: number;
  factor?: number;
  stress?: number;
  code?: "EC3" | "EC5";
  W: number;
  notes: string[];
}
export const ltbCases = [
  "Uniform moment",
  "Simply supported UDL",
  "Simply supported central point",
  "Custom coefficients",
];
export function lateralBuckling(
  s: Section,
  m: Material,
  L: number,
  E: number,
  G: number,
  o: EngineeringOptions = {},
): LTBResult {
  positive(L, "unbraced length Lb");
  if (
    !["i", "rectangle", "rhs", "shs", "circle", "chs"].includes(s.shape) ||
    Math.abs(s.Iyz) > 1e-8 * Math.sqrt(s.Iy * s.Iz)
  )
    throw Error(
      "This Mcr expression requires a doubly symmetric section. Channels, tees and angles need an appropriate monosymmetric/eigenvalue analysis.",
    );
  const timber = isTimber(m),
    p = materialStrength(m, o),
    properties = torsionProperties(s, o),
    notes: string[] = [];
  const mode = o.ltbCase ?? 0;
  if (![0, 1, 2, 3].includes(mode)) throw Error("Choose a supported LTB load case");
  if (timber && s.shape !== "rectangle")
    throw Error(
      "EC5 kcrit is currently supported for solid rectangular timber sections; other products require a verified stability model.",
    );
  const stiffnessE = positive(timber ? p.E05 : E, timber ? "E0,05" : "E"),
    stiffnessG = positive(timber ? p.G05 : G, timber ? "G0,05" : "G");
  const k = positive(o.kLT ?? 1, "lateral effective-length factor k"),
    kw = positive(o.kw ?? 1, "warping effective-length factor kw");
  let C1 = o.C1 ?? [1, 1.127, 1.348, 1][mode],
    C2 = o.C2 ?? [0, 0.454, 0.63, 0][mode];
  const zg = o.zg ?? 0;
  positive(C1, "C1");
  if (mode === 0 && zg !== 0)
    throw Error("Load height applies to transverse loading; choose UDL, point or custom coefficients");
  if (mode !== 3 && (k !== 1 || kw !== 1))
    throw Error("Preset coefficients assume k=kw=1. Choose Custom coefficients for other restraint factors");
  if (timber && (k !== 1 || kw !== 1 || zg !== 0 || o.C1 !== undefined || o.C2 !== undefined))
    throw Error(
      "Timber uses the EC5 effective-length method here. Set k=kw=1, C1/C2 automatic and load height zero; include load-height/restraint effects in the explicit effective length",
    );
  let Iw = properties.Iw;
  if (Iw === undefined && s.shape !== "i") Iw = 0;
  if (Iw === undefined || Iw < 0) throw Error("Enter a nonnegative warping constant Iw (mm6)");
  let J = properties.J;
  if (s.shape === "rectangle" && o.J === undefined && !s.raw.J) J = rectangleTorsion(s.b, s.h).J;
  let length = L,
    Mcr: number;
  if (timber) {
    // EC5 effective-length method; presets for fork-supported rectangular beams, load at shear centre.
    length = L * [1, 0.9, 0.8, 1][mode];
    C1 = 1;
    C2 = 0;
    Mcr = (Math.PI / length) * Math.sqrt(stiffnessE * s.Iz * stiffnessG * J);
    notes.push(
      `EC5 rectangular timber effective-length method: leff=${[1, 0.9, 0.8, 1][mode]} Lb. Custom case means Lb is the supplied effective length. E0,05/G0,05 are used; check the provenance of any derived CSV stiffness.`,
    );
  } else {
    const prefactor = (Math.PI ** 2 * stiffnessE * s.Iz) / (k * L) ** 2;
    const z = C2 * zg;
    const root = Math.sqrt(
      ((k / kw) ** 2 * Iw) / s.Iz + ((k * L) ** 2 * stiffnessG * J) / (Math.PI ** 2 * stiffnessE * s.Iz) + z * z,
    );
    Mcr = C1 * prefactor * (root - z);
    notes.push(
      "Fork supports restrain lateral movement and twist; preset warping is free. Positive zg is the destabilising load height above the shear centre for the shown downward load. C1/C2 presets: uniform EI, k=kw=1.",
    );
    if (s.shape !== "i")
      notes.push(
        "Warping contribution is taken as zero unless Iw is supplied. Thin-wall/solid torsion properties retain their stated approximations.",
      );
  }
  positive(Mcr, "computed Mcr");
  const basis = o.modulusBasis ?? 0;
  const W =
    basis === 1
      ? positive(s.Wply, "plastic modulus Wpl,y")
      : basis === 2
        ? positive(rawNumber(s.raw, "Weffy", "Weff_y", "W_eff_y"), "effective modulus Weff,y")
        : s.Wy;
  if (timber && basis !== 0) throw Error("Timber uses elastic section modulus Wel,y");
  const result: LTBResult = {
    Mcr,
    E: stiffnessE,
    G: stiffnessG,
    J,
    Iw,
    C1,
    C2,
    zg,
    k,
    kw,
    length,
    W,
    notes,
  };
  if (timber) {
    result.stress = Mcr / W;
    if (p.fm! > 0) {
      result.code = "EC5";
      result.lambda = Math.sqrt(p.fm! / result.stress);
      result.factor = timberLTBReduction(result.lambda);
    } else notes.push("Enter fm,k to show EC5 slenderness and kcrit.");
  } else if (isSteel(m)) {
    if (p.fy! > 0) {
      result.code = "EC3";
      result.lambda = Math.sqrt((W * p.fy!) / Mcr);
      result.factor = steelReduction(result.lambda, o.alphaLT ?? 0.34);
    } else
      notes.push(
        "Enter product/thickness-specific fy to show EC3 slenderness and chiLT. Grade-name nominal strength is a suggestion only.",
      );
    notes.push(
      `EC3 2005 general method 6.3.2.2, alphaLT=${o.alphaLT ?? 0.34} (editable curve b assumption). ${["Elastic Wel,y (Class 3 reference)", "Plastic Wpl,y (Classes 1–2 reference)", "Supplied effective Weff,y (Class 4 reference)"][basis]}. No automatic classification or resistance check.`,
    );
  }
  return result;
}

export const torqueCases = [
  "Cantilever; warping restrained at A",
  "Cantilever; warping free at A",
  "Both ends twist fixed; warping free",
  "Both ends twist and warping fixed",
];
export interface TorsionStation {
  x: number;
  theta: number;
  rate: number;
  B: number;
  Tsv: number;
  Tw: number;
  T: number;
  sigma?: number;
  tauSV?: number;
  tauW?: number;
}
export interface WarpingResult {
  stations: TorsionStation[];
  J: number;
  Iw: number;
  reactions: { x: number; T: number; B: number }[];
  notes: string[];
}
/** Small general (non-symmetric) system with row-scaled partial pivoting. */
function linearSolve(a: number[][], b: number[]) {
  const A = a.map((r, i) => [...r, b[i]]);
  for (const r of A) {
    const scale = Math.max(...r.slice(0, -1).map(Math.abs));
    if (!scale) throw Error("Degenerate torsion constraints");
    for (let j = 0; j < r.length; j++) r[j] /= scale;
  }
  for (let k = 0; k < b.length; k++) {
    let p = k;
    for (let i = k + 1; i < b.length; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    if (Math.abs(A[p][k]) < 1e-12)
      throw Error("Torsional stiffness ratio is outside the stable range of this preset; check J, Iw and length");
    [A[k], A[p]] = [A[p], A[k]];
    const d = A[k][k];
    for (let j = k; j <= b.length; j++) A[k][j] /= d;
    for (let i = 0; i < b.length; i++)
      if (i !== k) {
        const t = A[i][k];
        for (let j = k; j <= b.length; j++) A[i][j] -= t * A[k][j];
      }
  }
  return A.map((r) => r[b.length]);
}
/** Exact prismatic Vlasov solution, exponential basis prevents cosh overflow. One applied point torque. */
export function warpingTorsion(
  s: Section,
  E: number,
  G: number,
  T: number,
  L: number,
  position: number,
  o: EngineeringOptions = {},
): WarpingResult {
  positive(E, "E");
  positive(G, "G");
  positive(L, "length");
  if (!Number.isFinite(T)) throw Error("Enter a finite torque T");
  const mode = o.torqueCase ?? 0;
  if (![0, 1, 2, 3].includes(mode)) throw Error("Choose a torsion restraint case");
  const p = torsionProperties(s, o),
    J = p.J;
  if (p.Iw === 0)
    throw Error(
      "This section has Iw=0 in the supplied model. Use St. Venant torsion; no warping stress can be recovered",
    );
  const Iw = positive(p.Iw, "Iw; select an open I-section or supply the warping constant");
  if (position < 0 || position > L || !Number.isFinite(position))
    throw Error("Torque position must lie within the member");
  const a = position,
    b = L - a,
    beta = Math.sqrt((G * J) / (E * Iw)),
    U = T / (G * J),
    both = mode >= 2;
  const notes = [
    "Exact linear prismatic Vlasov torsion solution. x runs A to B; positive torque follows the right-hand rule about +x. B=-EIw theta''; Tw=B'. No coupling to axial/bending forces or second-order stability.",
  ];
  if ((a === 0 || b === 0) && both)
    throw Error("A torque applied at a twist-fixed support is reacted locally. Choose an interior torque position");
  // Cantilever tip load is represented by a single segment; no artificial short element.
  if (a === 0)
    return {
      stations: [0, L].map((x) => ({
        x,
        theta: 0,
        rate: 0,
        B: 0,
        Tsv: 0,
        Tw: 0,
        T: 0,
      })),
      J,
      Iw,
      reactions: [{ x: 0, T: -T, B: 0 }],
      notes,
    };
  const ea = Math.exp(-beta * a),
    eb = Math.exp(-beta * b);
  let R = 1,
    A = 0,
    B = 0,
    C = 0,
    D = 0;
  if (b === 0) {
    [A, B] = linearSolve(
      mode === 0
        ? [
            [1, ea],
            [-ea, 1],
          ]
        : [
            [-1, ea],
            [-ea, 1],
          ],
      mode === 0 ? [-1, 0] : [0, 0],
    );
  } else if (!both) {
    [A, B, C, D] = linearSolve(
      [mode === 0 ? [1, ea, 0, 0] : [-1, ea, 0, 0], [0, 0, -eb, 1], [ea, 1, -1, -eb], [-ea, 1, 1, -eb]],
      [mode === 0 ? -1 : 0, 0, -1, 0],
    );
  } else {
    const ia = -Math.expm1(-beta * a) / (beta * L),
      ib = -Math.expm1(-beta * b) / (beta * L);
    [R, A, B, C, D] = linearSolve(
      [
        mode === 3 ? [1, 1, ea, 0, 0] : [0, -1, ea, 0, 0],
        mode === 3 ? [1, 0, 0, eb, 1] : [0, 0, 0, -eb, 1],
        [0, ea, 1, -1, -eb],
        [0, -ea, 1, 1, -eb],
        [1, ia, ia, ib, ib],
      ],
      [0, mode === 3 ? 1 : 0, -1, 0, b / L],
    );
  }
  const firstIntegral = (x: number) =>
    R * x + (A * -Math.expm1(-beta * x)) / beta + (B * (Math.exp(-beta * (a - x)) - ea)) / beta;
  const at = (x: number, right = false): TorsionStation => {
    const second = b > 0 && (x > a || (x === a && right)),
      l = second ? b : a,
      t = second ? x - a : x,
      r = second ? R - 1 : R,
      c = second ? C : A,
      d = second ? D : B;
    const e1 = Math.exp(-beta * t),
      e2 = Math.exp(-beta * (l - t));
    const u = r + c * e1 + d * e2,
      du = beta * (-c * e1 + d * e2);
    const theta =
      U *
      (second
        ? firstIntegral(a) + (R - 1) * t + (C * -Math.expm1(-beta * t)) / beta + (D * (e2 - eb)) / beta
        : firstIntegral(x));
    const station: TorsionStation = {
      x,
      theta,
      rate: U * u,
      B: -E * Iw * U * du,
      Tsv: T * u,
      Tw: T * (r - u),
      T: T * r,
    };
    station.tauSV = stVenant(s, G, station.Tsv, undefined, { ...o, J }).tau;
    const omegaMax = s.shape === "i" ? ((s.h - s.tf) * s.b) / 4 : undefined;
    if (p.Ww) station.sigma = station.B / positive(p.Ww, "Womega");
    else if (omegaMax) station.sigma = (station.B * omegaMax) / Iw;
    if (s.shape === "i") station.tauW = (station.Tw * ((s.tf * (s.h - s.tf) * s.b ** 2) / 16)) / (Iw * s.tf);
    return station;
  };
  const positions = new Set([0, a, L]);
  for (let j = 1; j < 81; j++) positions.add((L * j) / 80);
  // Resolve end boundary layers even for very long members.
  for (const x of [0, a, L])
    for (const sign of [-1, 1])
      for (const t of [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8]) {
        const y = x + (sign * t) / beta;
        if (y > 0 && y < L) positions.add(y);
      }
  // Add exact extrema of twist (theta'=0), bimoment (B'=Tw=0), and torque split (B=0).
  for (const [lo, hi] of b > 0
    ? [
        [0, a],
        [a, L],
      ]
    : [[0, L]])
    for (const key of ["rate", "Tw", "B"] as const) {
      for (let j = 1; j <= 80; j++) {
        let x0 = lo + ((hi - lo) * (j - 1)) / 80,
          x1 = lo + ((hi - lo) * j) / 80;
        const right = lo === a && b > 0;
        let f0 = at(x0, right)[key],
          f1 = at(x1, hi === a ? false : right)[key];
        if (f0 * f1 < 0) {
          for (let k = 0; k < 48; k++) {
            const mid = (x0 + x1) / 2,
              fm = at(mid, right)[key];
            if (f0 * fm <= 0) x1 = mid;
            else {
              x0 = mid;
              f0 = fm;
            }
          }
          positions.add((x0 + x1) / 2);
        }
      }
    }
  const stations = [...positions]
    .sort((x, y) => x - y)
    .flatMap((x) => (x === a && b > 0 ? [at(x), at(x, true)] : [at(x)]));
  if (s.shape === "i")
    notes.push(
      "Stress recovery uses ideal thin I-flanges: omegaMax=(h-tf)b/4; Somega,max=tf(h-tf)b²/16. Supplied catalogue J/Iw are retained. Fillet and junction stress concentrations are excluded; the three peak stresses are at different physical points.",
    );
  else if (!p.Ww)
    notes.push(
      "Normal warping stress needs Womega or sectorial geometry. Twist, bimoment and torque components are available; no normal/shear warping stress is invented.",
    );
  const start = stations[0],
    end = stations.at(-1)!;
  return {
    stations,
    J,
    Iw,
    notes,
    reactions: [{ x: 0, T: -R * T, B: start.B }, ...(both ? [{ x: L, T: (R - 1) * T, B: -end.B }] : [])],
  };
}
