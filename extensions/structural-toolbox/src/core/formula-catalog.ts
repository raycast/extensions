import { formulas, Formula, FormulaValues, Answer } from "./formulas";
const answer = (label: string, value: number, unit: string, equation: string): Answer => ({
  label,
  value,
  unit,
  equation,
});
const continuous: Formula[] = ["udl", "point"].map((kind) => ({
  id: "continuous-" + kind,
  title:
    kind === "udl"
      ? "Two equal continuous spans, UDL on both spans"
      : "Two equal continuous spans, point at first-span centre",
  group: "Beams",
  beam: "continuous",
  loading: kind as "udl" | "point",
  inputs: ["L", kind === "udl" ? "q" : "P", "E", "I"],
  equation:
    kind === "udl" ? "Mᴮ = −qL²/8; Rᴬ = Rᶜ = 3qL/8; Rᴮ = 5qL/4" : "Mᴮ = −3PL/32; Rᴬ = 13P/32; Rᴮ = 11P/16; Rᶜ = −3P/32",
  note: "Two equal spans, constant EI, three simple supports and continuous rotation at the middle support. L is EACH span. Positive load is downward. Point case loads only the centre of the first span; use Analysis for other positions or arrangements. No support uplift restraint check is included.",
  compute: (v) => {
    const { L, q, P, E, I } = v,
      udl = kind === "udl",
      mb = udl ? (-q * L * L) / 8 : (-3 * P * L) / 32,
      ra = udl ? (3 * q * L) / 8 : (13 * P) / 32,
      rc = udl ? ra : (-3 * P) / 32,
      rb = udl ? (5 * q * L) / 4 : (11 * P) / 16;
    const t = udl ? (1 + Math.sqrt(33)) / 16 : Math.sqrt(3 / 13);
    const delta = udl
      ? (q * L ** 4 * (t ** 4 / 24 - t ** 3 / 16 + t / 48)) / (E * I)
      : (P * L ** 3 * ((3 * t) / 64 - (13 * t ** 3) / 192)) / (E * I);
    return [
      answer(
        "Maximum sagging moment",
        (udl ? (9 * q * L * L) / 128 : (13 * P * L) / 64) / 1e6,
        "kN·m",
        udl ? "M+ = 9qL²/128" : "M+ = 13PL/64",
      ),
      answer("Middle support moment", mb / 1e6, "kN·m", udl ? "Mᴮ = −qL²/8" : "Mᴮ = −3PL/32"),
      answer(
        "Maximum shear magnitude",
        (udl ? (5 * q * L) / 8 : (19 * P) / 32) / 1000,
        "kN",
        udl ? "Vmax = 5qL/8" : "Vmax = 19P/32",
      ),
      answer(
        "Maximum downward deflection",
        delta,
        "mm",
        udl ? "δ = qL⁴(t⁴/24 − t³/16 + t/48)/(EI); t=(1+√33)/16" : "δ = PL³(3t/64 − 13t³/192)/(EI); t=√(3/13)",
      ),
      answer("Reaction A", ra / 1000, "kN", udl ? "Rᴬ = 3qL/8" : "Rᴬ = 13P/32"),
      answer("Reaction B", rb / 1000, "kN", udl ? "Rᴮ = 5qL/4" : "Rᴮ = 11P/16"),
      answer("Reaction C", rc / 1000, "kN", udl ? "Rᶜ = 3qL/8" : "Rᶜ = −3P/32"),
    ];
  },
}));
const positionCases: Formula[] = [
  {
    id: "cant-position",
    title: "Cantilever, point load at a position",
    group: "Beams",
    beam: "cantilever",
    loading: "point",
    inputs: ["L", "P", "a", "E", "I"],
    equation: "Mmax = Pa; δtip = Pa²(3L−a)/(6EI)",
    note: "a is measured from the fixed support. Default position is midspan. Constant EI and small deflection.",
    compute: (v) => {
      if (v.a < 0 || v.a > v.L) throw Error("Position must be within the span");
      return [
        answer("Support moment magnitude", (v.P * v.a) / 1e6, "kN·m", "|M|max = Pa"),
        answer("Maximum shear magnitude", v.P / 1000, "kN", "Vmax = P"),
        answer(
          "Maximum downward deflection",
          (v.P * v.a ** 2 * (3 * v.L - v.a)) / (6 * v.E * v.I),
          "mm",
          "δtip = Pa²(3L−a)/(6EI)",
        ),
        answer("Vertical reaction", v.P / 1000, "kN", "R = P"),
      ];
    },
  },
  {
    id: "fixed-position",
    title: "Fixed at both ends, point load at a position",
    group: "Beams",
    beam: "fixed",
    loading: "point",
    inputs: ["L", "P", "a", "E", "I"],
    equation: "Mᴬ = −Pab²/L²; Mᴮ = −Pa²b/L²; b=L−a",
    note: "a is measured from the left support. Default position is midspan. Constant EI, fixed translations and rotations.",
    compute: (v) => {
      const { L, P, a, E, I } = v;
      if (a < 0 || a > L) throw Error("Position must be within the span");
      const b = L - a,
        ma = (-P * a * b * b) / L ** 2,
        mb = (-P * a * a * b) / L ** 2,
        ra = (P * b * b * (3 * a + b)) / L ** 3,
        rb = (P * a * a * (a + 3 * b)) / L ** 3;
      const rotation = (x: number) => ma * x + (ra * x * x) / 2 - (P * Math.max(0, x - a) ** 2) / 2;
      const displacement = (x: number) =>
        ((ma * x * x) / 2 + (ra * x ** 3) / 6 - (P * Math.max(0, x - a) ** 3) / 6) / (E * I);
      let delta = 0;
      for (let j = 1; j < 100; j++) {
        let lo = (L * (j - 1)) / 100,
          hi = (L * j) / 100;
        delta = Math.max(delta, Math.abs(displacement(hi)));
        if (rotation(lo) * rotation(hi) < 0) {
          for (let k = 0; k < 50; k++) {
            const mid = (lo + hi) / 2;
            if (rotation(lo) * rotation(mid) <= 0) hi = mid;
            else lo = mid;
          }
          delta = Math.max(delta, Math.abs(displacement((lo + hi) / 2)));
        }
      }
      return [
        answer("Left support moment", ma / 1e6, "kN·m", "Mᴬ = −Pab²/L²"),
        answer("Right support moment", mb / 1e6, "kN·m", "Mᴮ = −Pa²b/L²"),
        answer("Maximum sagging moment", (ma + ra * a) / 1e6, "kN·m", "M(a) = Mᴬ + Rᴬa"),
        answer("Maximum shear magnitude", Math.max(ra, rb) / 1000, "kN", "Vmax = max(Rᴬ,Rᴮ)"),
        answer("Maximum downward deflection", delta, "mm", "EI v(x) = Mᴬx²/2 + Rᴬx³/6 − P⟨x−a⟩³/6; maximum at dv/dx=0"),
        answer("Reaction A", ra / 1000, "kN", "Rᴬ = Pb²(3a+b)/L³"),
        answer("Reaction B", rb / 1000, "kN", "Rᴮ = Pa²(a+3b)/L³"),
      ];
    },
  },
];
export const beamCases = [...formulas.filter((f) => f.group === "Beams"), ...continuous, ...positionCases];
export const formulaCatalog: Formula[] = [
  ...formulas.filter((f) => f.group !== "Beams" && f.id !== "modulus"),
  ...beamCases
    .filter((f) => !["ss-point", "cant-point", "fixed-point"].includes(f.id))
    .flatMap((original) => {
      const base =
        original.id === "ss-offcentre"
          ? {
              ...original,
              title: "Simply supported, point load at a position",
              note: original.note + " Position defaults to midspan.",
            }
          : original;
      const compute = (v: FormulaValues) => {
        const answers = base.compute(v);
        if (!answers.some((a) => /shear/.test(a.label))) {
          const reactions = answers.filter((a) => /reaction/i.test(a.label));
          if (reactions.length)
            answers.push(
              answer(
                "Maximum shear magnitude",
                Math.max(...reactions.map((a) => Math.abs(a.value))),
                "kN",
                "Vmax = max(|Rᴬ|, |Rᴮ|)",
              ),
            );
        }
        return answers;
      };
      const sample = compute({
        L: 6000,
        P: 10000,
        q: 3,
        E: 11000,
        I: 1e8,
        A: 1e4,
        W: 1e6,
        N: 1e4,
        M: 1e7,
        K: 1,
        a: 3000,
      });
      return ["moment", "shear", "deflection", "reactions"].flatMap((output) => {
        const matches = (a: Answer) =>
          output === "moment"
            ? /moment/i.test(a.label)
            : output === "shear"
              ? /shear/i.test(a.label)
              : output === "deflection"
                ? /deflection/i.test(a.label)
                : /reaction/i.test(a.label);
        if (!sample.some(matches)) return [];
        const stiffness = output === "deflection";
        return [
          {
            ...base,
            id: base.id + "@" + output,
            title:
              (
                {
                  moment: "Bending moment",
                  shear: "Maximum shear",
                  deflection: "Maximum deflection",
                  reactions: "Support reactions",
                } as Record<string, string>
              )[output] +
              " — " +
              base.title.replace(/ · /g, ", "),
            inputs: base.inputs.filter((k) => stiffness || !["E", "I"].includes(k)),
            equation:
              sample
                .filter(matches)
                .map((a) => a.equation)
                .join("; ") + (base.id === "ss-offcentre" && output === "moment" ? "; at midspan Mmax = PL/4" : ""),
            compute: (v: FormulaValues) => compute(v).filter(matches),
          },
        ];
      });
    }),
];
