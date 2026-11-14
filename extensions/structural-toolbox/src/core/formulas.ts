import { Section } from "./types";
import { sectionPropertyValues } from "./section-properties";
import { EngineeringOptions, stVenant, lateralBuckling, warpingTorsion } from "./stability-torsion";
export interface FormulaValues extends EngineeringOptions {
  L: number;
  P: number;
  q: number;
  E: number;
  I: number;
  A: number;
  W: number;
  N: number;
  M: number;
  K: number;
  a: number;
  section?: Section;
  eulerAboutSection?: boolean;
}
export interface Answer {
  label: string;
  value: number;
  unit: string;
  equation: string;
  substitution?: string;
}
export interface Formula {
  id: string;
  title: string;
  group: string;
  equation: string;
  inputs: (keyof FormulaValues)[];
  note: string;
  beam?: "simple" | "cantilever" | "fixed" | "propped" | "continuous";
  loading?: "point" | "udl";
  compute: (v: FormulaValues) => Answer[];
}
const ans = (label: string, value: number, unit: string, equation: string, substitution?: string): Answer => ({
  label,
  value,
  unit,
  equation,
  substitution,
});
const refs =
  "Linear elastic, constant EI, small deflection; bending deformation only. Enter span in m, force in kN, line load in kN/m and E in MPa; explicit compatible units are accepted.";
export const formulas: Formula[] = [
  {
    id: "torsion-sv",
    title: "St. Venant torsion",
    group: "Stresses",
    equation: "theta' = T/(GJ); stress depends on section shape",
    inputs: ["T", "E", "G", "section"],
    note: "Unrestrained St. Venant torsion. T in kNm; optional L in m gives total twist. Uniform scalar G; thin-wall/open-plate stress approximations are identified. Restrained warping uses the separate Warping torsion calculator.",
    compute: (v) => {
      const r = stVenant(v.section!, v.G!, v.T!, Number.isFinite(v.L) ? v.L : undefined, v);
      return [
        ...(r.tau === undefined ? [] : [ans("Maximum torsional shear", r.tau, "MPa", r.equation)]),
        ans("Twist per metre", (r.rate * 1000 * 180) / Math.PI, "deg/m", "theta'=T/(GJ)"),
        ...(r.twist === undefined ? [] : [ans("Total twist", (r.twist * 180) / Math.PI, "deg", "theta=TL/(GJ)")]),
      ];
    },
  },
  {
    id: "torsion-warping",
    title: "Warping torsion",
    group: "Stresses",
    equation: "T=GJ theta'−EIw theta'''; B=−EIw theta''",
    inputs: ["L", "T", "a", "E", "G", "section"],
    note: "Prismatic Vlasov torsion with one point torque. Select twist and warping restraints; default cantilever with restrained warping at A and torque at the free end. Stress peaks occur at different locations and must not be combined as co-located stresses.",
    compute: (v) => {
      const r = warpingTorsion(v.section!, v.E, v.G!, v.T!, v.L, v.a, v),
        max = (key: string) => Math.max(...r.stations.map((s) => Math.abs((s as any)[key] ?? 0)));
      return [
        ans("Maximum twist", (max("theta") * 180) / Math.PI, "deg", "Vlasov torsion solution"),
        ans("Maximum bimoment", max("B") / 1e9, "kN·m²", "B=−EIw theta''"),
        ...(r.stations.some((s) => s.tauSV !== undefined)
          ? [ans("St. Venant shear peak", max("tauSV"), "MPa", "tauSV=|Tsv|t/J (open thin plate)")]
          : []),
        ...(r.stations.some((s) => s.sigma !== undefined)
          ? [ans("Warping normal peak", max("sigma"), "MPa", "sigmaw=B omega/Iw")]
          : []),
        ...(r.stations.some((s) => s.tauW !== undefined)
          ? [ans("Warping shear peak", max("tauW"), "MPa", "tauw=Tw Somega/(Iw t)")]
          : []),
      ];
    },
  },
  {
    id: "ltb",
    title: "Lateral-torsional buckling",
    group: "Buckling",
    equation: "Mcr=C1 pi² E Iz/(kL)² [sqrt((k/kw)² Iw/Iz+(kL)² GJ/(pi² E Iz)+(C2 zg)²)−C2 zg]",
    inputs: ["L", "E", "G", "section"],
    note: "Elastic Mcr for a uniform doubly symmetric member with specified lateral/twist restraints. L is unbraced length. EC3/EC5 reduction factors are FYI only: no design resistance, section classification or pass/fail check. Code basis: EN 1993-1-1:2005 general LTB method; EN 1995-1-1:2004.",
    compute: (v) => {
      const m = v.material;
      if (!m) throw Error("Select a material");
      const r = lateralBuckling(v.section!, m, v.L, v.E, v.G!, v);
      return [
        ans("Elastic critical moment", r.Mcr / 1e6, "kN·m", "Elastic LTB equation"),
        ...(r.lambda === undefined
          ? []
          : [
              ans("Relative slenderness", r.lambda, "—", "sqrt(reference moment/Mcr)"),
              ans(
                r.code === "EC5" ? "kcrit" : "chiLT",
                r.factor!,
                "—",
                r.code === "EC5" ? "EC5 piecewise reduction" : "EC3 general reduction curve",
              ),
              ...(r.stress === undefined
                ? []
                : [ans("Critical bending stress", r.stress, "MPa", "sigma_m,crit=Mcr/Wel,y")]),
            ]),
      ];
    },
  },
  {
    id: "properties",
    title: "Section properties",
    group: "Sections",
    equation: "Wᵧ = Iᵧ / zₘₐₓ · rᵧ = √(Iᵧ/A)",
    inputs: ["section"],
    note: "Full section properties from geometry or the selected catalogue. Asymmetric sections have coupled bending; elastic modulus alone is not a complete stress check.",
    compute: (v) => {
      if (!v.section) throw Error("Choose a section");
      return sectionPropertyValues(v.section).map((p) => ans(p.key, p.value, p.unit, p.tex));
    },
  },
  {
    id: "modulus",
    title: "Elastic section modulus",
    group: "Sections",
    equation: "W = I / c",
    inputs: ["I", "a"],
    note: "a is the distance c from the centroid to the extreme fibre, in mm.",
    compute: (v) => [ans("Section modulus", v.I / v.a, "mm³", "W = I / c", `${v.I} / ${v.a}`)],
  },
  {
    id: "radius",
    title: "Radius of gyration",
    group: "Sections",
    equation: "r = √(I/A)",
    inputs: ["I", "A"],
    note: "Use matching centroidal axis properties.",
    compute: (v) => [ans("Radius of gyration", Math.sqrt(v.I / v.A), "mm", "r = √(I/A)", `√(${v.I} / ${v.A})`)],
  },
  {
    id: "axial-stress",
    title: "Elastic axial stress",
    group: "Stresses",
    equation: "σ = N / A",
    inputs: ["N", "A"],
    note: "Positive N is tension; average axial stress.",
    compute: (v) => [ans("Axial stress", v.N / v.A, "MPa", "σ = N / A", `${v.N} / ${v.A}`)],
  },
  {
    id: "bending-stress",
    title: "Elastic bending stress",
    group: "Stresses",
    equation: "|σ| = |M| / W",
    inputs: ["M", "W"],
    note: "Magnitude of extreme-fibre elastic stress for uncoupled uniaxial bending.",
    compute: (v) => {
      if (v.section && Math.abs(v.section.Iyz) > 1e-6 * v.section.Iy && Math.abs(v.W - v.section.Wy) < 1e-6 * v.W)
        throw Error(
          "This section has coupled bending. Enter an explicit principal-axis W for M/W, or use a section with uncoupled bending.",
        );
      return [ans("Bending stress magnitude", Math.abs(v.M) / v.W, "MPa", "|σ| = |M| / W", `|${v.M}| / ${v.W}`)];
    },
  },
  {
    id: "rect-shear",
    title: "Rectangular section shear stress",
    group: "Stresses",
    equation: "τmax = 3V / (2A)",
    inputs: ["P", "A"],
    note: "P is shear force V. Solid rectangular homogeneous section only.",
    compute: (v) => {
      if (v.section && v.section.shape !== "rectangle")
        throw Error(
          "This expression is for a solid rectangle. Choose a rectangle or use Structures → Beam → Section stresses for the selected shape.",
        );
      return [ans("Maximum shear stress", (1.5 * Math.abs(v.P)) / v.A, "MPa", "τmax = 3|V| / (2A)")];
    },
  },
  {
    id: "axial-deformation",
    title: "Axial deformation",
    group: "Deformation",
    equation: "ΔL = NL / (EA)",
    inputs: ["N", "L", "E", "A"],
    note: "Prismatic member; constant axial force. Positive is extension.",
    compute: (v) => [
      ans(
        "Axial deformation",
        (v.N * v.L) / (v.E * v.A),
        "mm",
        "ΔL = NL / (EA)",
        `${v.N} × ${v.L} / (${v.E} × ${v.A})`,
      ),
    ],
  },
  {
    id: "euler",
    title: "Euler elastic critical load",
    group: "Buckling",
    equation: "Ncr = π²EI / (KL)²",
    inputs: ["E", "I", "K", "L"],
    note: "Ideal elastic column: selected sections return both centroidal y/z axes, or principal u/v axes when Iyz is nonzero. The displayed common K applies to both axes. An explicit I returns only that supplied inertia. This is an ideal elastic load, not a code design resistance.",
    compute: (v) => {
      const s = v.section,
        coupled = s && Math.abs(s.Iyz) > 1e-8 * Math.sqrt(s.Iy * s.Iz);
      const axes =
        v.eulerAboutSection && s
          ? coupled
            ? [
                ["u", s.Imajor],
                ["v", s.Iminor],
              ]
            : [
                ["y", s.Iy],
                ["z", s.Iz],
              ]
          : [["", v.I]];
      return axes.map(([axis, inertia]) =>
        ans(
          axis ? "Ncr," + axis : "Elastic critical load",
          (Math.PI ** 2 * v.E * Number(inertia)) /
            ((axis === "y" || axis === "u" ? (v.Ky ?? v.K) : axis === "z" || axis === "v" ? (v.Kz ?? v.K) : v.K) *
              v.L) **
              2 /
            1000,
          "kN",
          axis ? `Ncr,${axis} = π² E I${axis} / (KL)²` : "Ncr = π²EI / (KL)²",
          `π² × ${v.E} × ${inertia} / (${axis === "y" || axis === "u" ? (v.Ky ?? v.K) : axis === "z" || axis === "v" ? (v.Kz ?? v.K) : v.K} × ${v.L})² / 1000`,
        ),
      );
    },
  },
  {
    id: "ss-point",
    title: "Simply supported · central point load",
    group: "Beams",
    equation: "Mmax = PL/4 · δmax = PL³/(48EI)",
    inputs: ["L", "P", "E", "I"],
    note: refs,
    beam: "simple",
    loading: "point",
    compute: (v) => [
      ans("Maximum sagging moment", (v.P * v.L) / 4e6, "kN·m", "Mmax = PL/4", `${v.P} × ${v.L} / 4`),
      ans("Maximum shear magnitude", Math.abs(v.P) / 2000, "kN", "|V|max = |P|/2"),
      ans(
        "Maximum downward deflection",
        (v.P * v.L ** 3) / (48 * v.E * v.I),
        "mm",
        "δmax = PL³/(48EI)",
        `${v.P} × ${v.L}³ / (48 × ${v.E} × ${v.I})`,
      ),
      ans("Reaction A", v.P / 2000, "kN", "Rₐ = P/2"),
      ans("Reaction B", v.P / 2000, "kN", "Rᵦ = P/2"),
      ans("Support slope magnitude", (Math.abs(v.P) * v.L ** 2) / (16 * v.E * v.I), "rad", "|θ| = |P|L²/(16EI)"),
    ],
  },
  {
    id: "ss-udl",
    title: "Simply supported · uniform load",
    group: "Beams",
    equation: "Mmax = qL²/8 · δmax = 5qL⁴/(384EI)",
    inputs: ["L", "q", "E", "I"],
    note: refs,
    beam: "simple",
    loading: "udl",
    compute: (v) => [
      ans("Maximum sagging moment", (v.q * v.L ** 2) / 8e6, "kN·m", "Mmax = qL²/8"),
      ans("Maximum shear magnitude", (Math.abs(v.q) * v.L) / 2000, "kN", "|V|max = |q|L/2"),
      ans(
        "Maximum downward deflection",
        (5 * v.q * v.L ** 4) / (384 * v.E * v.I),
        "mm",
        "δmax = 5qL⁴/(384EI)",
        `5 × ${v.q} × ${v.L}⁴ / (384 × ${v.E} × ${v.I})`,
      ),
      ans("Reaction A", (v.q * v.L) / 2000, "kN", "Rₐ = qL/2"),
      ans("Reaction B", (v.q * v.L) / 2000, "kN", "Rᵦ = qL/2"),
      ans("Support slope magnitude", (Math.abs(v.q) * v.L ** 3) / (24 * v.E * v.I), "rad", "|θ| = |q|L³/(24EI)"),
    ],
  },
  {
    id: "cant-point",
    title: "Cantilever · tip point load",
    group: "Beams",
    equation: "|M|max = PL · δtip = PL³/(3EI)",
    inputs: ["L", "P", "E", "I"],
    note: refs,
    beam: "cantilever",
    loading: "point",
    compute: (v) => [
      ans("Support moment magnitude", (v.P * v.L) / 1e6, "kN·m", "|M|max = PL"),
      ans("Maximum shear magnitude", Math.abs(v.P) / 1000, "kN", "|V|max = |P|"),
      ans("Tip downward deflection", (v.P * v.L ** 3) / (3 * v.E * v.I), "mm", "δtip = PL³/(3EI)"),
      ans("Vertical reaction", v.P / 1000, "kN", "R = P"),
      ans("Tip slope magnitude", (Math.abs(v.P) * v.L ** 2) / (2 * v.E * v.I), "rad", "|θtip| = |P|L²/(2EI)"),
    ],
  },
  {
    id: "cant-udl",
    title: "Cantilever · uniform load",
    group: "Beams",
    equation: "|M|max = qL²/2 · δtip = qL⁴/(8EI)",
    inputs: ["L", "q", "E", "I"],
    note: refs,
    beam: "cantilever",
    loading: "udl",
    compute: (v) => [
      ans("Support moment magnitude", (v.q * v.L * v.L) / 2e6, "kN·m", "|M|max = qL²/2"),
      ans("Maximum shear magnitude", (Math.abs(v.q) * v.L) / 1000, "kN", "|V|max = |q|L"),
      ans("Tip downward deflection", (v.q * v.L ** 4) / (8 * v.E * v.I), "mm", "δtip = qL⁴/(8EI)"),
      ans("Vertical reaction", (v.q * v.L) / 1000, "kN", "R = qL"),
      ans("Tip slope magnitude", (Math.abs(v.q) * v.L ** 3) / (6 * v.E * v.I), "rad", "|θtip| = |q|L³/(6EI)"),
    ],
  },
  {
    id: "fixed-udl",
    title: "Fixed–fixed · uniform load",
    group: "Beams",
    equation: "Mmid = qL²/24 · δmax = qL⁴/(384EI)",
    inputs: ["L", "q", "E", "I"],
    note: refs,
    beam: "fixed",
    loading: "udl",
    compute: (v) => [
      ans("Midspan sagging moment", (v.q * v.L ** 2) / 24e6, "kN·m", "Mmid = qL²/24"),
      ans("Support hogging moment", (-v.q * v.L ** 2) / 12e6, "kN·m", "Msupport = −qL²/12"),
      ans("Maximum shear magnitude", (Math.abs(v.q) * v.L) / 2000, "kN", "|V|max = |q|L/2"),
      ans("Maximum downward deflection", (v.q * v.L ** 4) / (384 * v.E * v.I), "mm", "δmax = qL⁴/(384EI)"),
      ans("Reaction A", (v.q * v.L) / 2000, "kN", "Rₐ = qL/2"),
      ans("Reaction B", (v.q * v.L) / 2000, "kN", "Rᵦ = qL/2"),
    ],
  },
  {
    id: "fixed-point",
    title: "Fixed–fixed · central point load",
    group: "Beams",
    equation: "|Msupport| = PL/8 · δmax = PL³/(192EI)",
    inputs: ["L", "P", "E", "I"],
    note: refs,
    beam: "fixed",
    loading: "point",
    compute: (v) => [
      ans("Midspan sagging moment", (v.P * v.L) / 8e6, "kN·m", "Mmid = PL/8"),
      ans("Support hogging moment", (-v.P * v.L) / 8e6, "kN·m", "Msupport = −PL/8"),
      ans("Maximum downward deflection", (v.P * v.L ** 3) / (192 * v.E * v.I), "mm", "δmax = PL³/(192EI)"),
      ans("Reaction A", v.P / 2000, "kN", "Rₐ = P/2"),
      ans("Reaction B", v.P / 2000, "kN", "Rᵦ = P/2"),
    ],
  },
  {
    id: "propped-udl",
    title: "Propped cantilever · uniform load",
    group: "Beams",
    equation: "Rfixed = 5qL/8 · Rprop = 3qL/8",
    inputs: ["L", "q", "E", "I"],
    note: refs + " Fixed at A, roller at B.",
    beam: "propped",
    loading: "udl",
    compute: (v) => {
      const f = (15 - Math.sqrt(33)) / 16;
      return [
        ans("Fixed-end hogging moment", (-v.q * v.L ** 2) / 8e6, "kN·m", "Mₐ = −qL²/8"),
        ans("Maximum sagging moment", (9 * v.q * v.L ** 2) / 128e6, "kN·m", "M+max = 9qL²/128"),
        ans(
          "Maximum downward deflection",
          (v.q * v.L ** 4 * f * f * (3 - 5 * f + 2 * f * f)) / (48 * v.E * v.I),
          "mm",
          "δ(x) = qx²(3L² − 5Lx + 2x²)/(48EI)",
        ),
        ans("Deflection location from A", (f * v.L) / 1000, "m", "x/L = (15 − √33)/16"),
        ans("Reaction A", (5 * v.q * v.L) / 8000, "kN", "Rₐ = 5qL/8"),
        ans("Reaction B", (3 * v.q * v.L) / 8000, "kN", "Rᵦ = 3qL/8"),
      ];
    },
  },
  {
    id: "ss-offcentre",
    beam: "simple",
    loading: "point",
    title: "Simply supported · off-centre point load",
    group: "Beams",
    equation: "Rₐ = Pb/L · Rᵦ = Pa/L · Mmax = Pab/L",
    inputs: ["L", "P", "a", "E", "I"],
    note: refs + " a is the position from A (enter m); b = L − a.",
    compute: (v) => {
      if (v.a < 0 || v.a > v.L) throw Error("Point position must be within the span");
      const b = v.L - v.a,
        x = v.a <= v.L / 2 ? v.L - Math.sqrt((v.L * v.L - v.a * v.a) / 3) : Math.sqrt((v.L * v.L - b * b) / 3);
      const def =
        x <= v.a
          ? (v.P * b * x * (v.L * v.L - b * b - x * x)) / (6 * v.L * v.E * v.I)
          : (v.P * v.a * (v.L - x) * (2 * v.L * x - x * x - v.a * v.a)) / (6 * v.L * v.E * v.I);
      return [
        ans("Reaction A", (v.P * b) / v.L / 1000, "kN", "Rₐ = Pb/L"),
        ans("Reaction B", (v.P * v.a) / v.L / 1000, "kN", "Rᵦ = Pa/L"),
        ans("Maximum sagging moment", (v.P * v.a * b) / v.L / 1e6, "kN·m", "Mmax = Pab/L"),
        ans("Maximum downward deflection", def, "mm", "Piecewise elastic beam equation"),
        ans("Deflection location from A", x / 1000, "m", "dδ/dx = 0"),
      ];
    },
  },
];
export function calculate(f: Formula, v: FormulaValues): Answer[] {
  if (f.id === "euler" && v.eulerAboutSection === false && (v.Ky !== undefined || v.Kz !== undefined))
    throw Error("An explicit single I uses K. Remove Ky/Kz or select a section for separate axis factors");
  for (const k of ["Ky", "Kz"] as const)
    if (v[k] !== undefined && (!(v[k]! > 0) || !Number.isFinite(v[k]))) throw Error(k + " must be positive and finite");
  for (const key of f.inputs) {
    if (key === "section") continue;
    const n = v[key];
    if (typeof n !== "number" || !Number.isFinite(n)) throw Error(`Enter a finite ${key}`);
    if (["L", "E", "G", "I", "A", "W", "K"].includes(key) && n <= 0) throw Error(`${key} must be positive`);
  }
  if (f.id === "modulus" && v.a <= 0) throw Error("Extreme fibre distance must be positive");
  if (f.group === "Beams" && (v.P < 0 || v.q < 0))
    throw Error(
      "Formula library uses positive downward load magnitudes; use Structural Analysis for signed general loading.",
    );
  return f.compute(v);
}
