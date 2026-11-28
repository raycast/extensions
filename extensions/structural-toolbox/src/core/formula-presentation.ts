import { fuzzyScore } from "./library";
import { Formula } from "./formulas";

/** Short row labels; the section heading carries the requested output. */
export function formulaLabel(f: Formula) {
  if (f.beam) {
    const support = {
      simple: "Simply supported",
      cantilever: "Cantilever",
      fixed: "Fixed ends",
      propped: "Propped cantilever",
      continuous: "Two equal spans",
    }[f.beam];
    return {
      title: support,
      subtitle: f.loading === "udl" ? "UDL" : "Point",
      group:
        {
          moment: "Bending moment",
          shear: "Shear force",
          deflection: "Deflection",
          reactions: "Reactions",
        }[f.id.split("@")[1]] || "Beam formulas",
    };
  }
  const titles: Record<string, string> = {
    properties: "Section properties",
    modulus: "Section modulus",
    radius: "Gyration radius",
    "axial-stress": "Axial stress",
    "bending-stress": "Bending stress",
    "rect-shear": "Rectangle shear",
    "axial-deformation": "Axial extension",
    "torsion-sv": "St. Venant torsion",
    "torsion-warping": "Warping torsion",
    ltb: "Lateral buckling",
    euler: "Euler buckling",
  };
  return { title: titles[f.id] || f.title, subtitle: "", group: f.group };
}

/** Search visible names and engineering synonyms, including whole-word typos. */
export function formulaSearchScore(query: string, f: Formula) {
  const label = formulaLabel(f);
  const aliases: Record<string, string> = {
    "torsion-sv": "torque torsional stress twist saint venant",
    "torsion-warping": "torque warping bimoment torsional stress restrained",
    ltb: "lateral torsional buckling Mcr chiLT kcrit",
    euler: "buckling critical column load eurler chi kc factor",
    "axial-stress": "stress finder normal tension compression",
    "bending-stress": "stress finder flexural normal",
    "rect-shear": "stress finder shear stress",
    radius: "gyration radius",
    modulus: "section modulus",
    properties: "section properties modulus elastic plastic area inertia bending shear torsion warping",
  };
  const texts = [f.title, f.equation, f.id, f.group, label.title, label.group, aliases[f.id] || ""];
  return Math.max(
    ...texts.flatMap((text) => [fuzzyScore(query, text), ...text.split(/\s+/).map((word) => fuzzyScore(query, word))]),
  );
}
