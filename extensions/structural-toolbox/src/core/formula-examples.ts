import { Formula } from "./formulas";
export function formulaPrimaryInputs(f: Formula) {
  return f.inputs.filter((k) => !["section", "E", "G", "I", "A", "W", "K", "a"].includes(k));
}
function baseExample(f: Formula, annotated = false) {
  const examples: Record<string, [string, string]> = {
    T: ["T=1kNm", "torque"],
    L: ["6m", f.beam === "continuous" ? "each span" : "span"],
    P: [f.id === "rect-shear" ? "V=10kN" : "10kN", f.id === "rect-shear" ? "shear force" : "point load"],
    q: ["3kN/m", "UDL"],
    N: ["N=10kN", "axial force"],
    M: ["M=20kNm", "moment"],
  };
  const keys = formulaPrimaryInputs(f);
  if (!keys.length) {
    if (f.id === "properties") return annotated ? "rect 100x300 (section)" : "rect 100x300";
    if (f.id === "radius") return annotated ? "I=1943cm4 (inertia), A=100cm2 (area)" : "I=1943cm4, A=100cm2";
    return annotated ? "I=1943cm4 (inertia), c=100mm (fibre distance)" : "I=1943cm4, c=100mm";
  }
  return keys.map((k) => (annotated ? `${examples[k][0]} (${examples[k][1]})` : examples[k][0])).join(", ");
}

export function formulaExample(f: Formula, annotated = false) {
  if (f.id === "torsion-sv") return "T=1kNm, S355, IPE200, 3m";
  if (f.id === "torsion-warping") return "cantilever restrained, 3m, T=1kNm, S355, IPE200";
  if (f.id === "ltb") return "uniform moment, 3m, S355, IPE200, fy=355MPa";
  const value = baseExample(f, annotated);
  if (f.id === "euler")
    return (
      value + (annotated ? ", C24 (material), 100x300 (section), K=1 (effective-length factor)" : ", C24, 100x300, K=1")
    );
  if (f.id === "axial-deformation")
    return value + (annotated ? ", C24 (material), 100x300 (section)" : ", C24, 100x300");
  return f.group === "Stresses" ? value + (annotated ? ", 100x300 (section)" : ", 100x300") : value;
}
