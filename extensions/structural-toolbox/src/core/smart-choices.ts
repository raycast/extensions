import { Library, fuzzyScore, materialFromText } from "./library";
import { parseSection } from "./input";
import { Material, Section } from "./types";
export interface Choice {
  title: string;
  value: string;
  group: string;
  hint?: string;
  explanation?: string;
  replace: boolean;
  commit?: boolean;
}
export const choiceID = (c: Choice) => "choice-" + c.group + "-" + c.value;
export const cleanSectionName = (s: Section) => s.id.replace(/^(?:sawn|glulam)\s+/i, "");
export const cleanMaterialName = (m: Material) => m.id.replace(/^Steel-/i, "");
export const sectionFamily = (s: Section) => s.family || s.shape;
export function preferredMaterial(s: Section, lib: Library) {
  const id = /glulam/i.test(s.family)
    ? "GL24h"
    : /sawn|timber|lvl/i.test(s.family)
      ? "C24"
      : /(?:^|\s)(?:ipe|he[abm]|upn|shs|rhs|chs|steel|equal l)(?:\s|$)/i.test(s.family + " " + s.id) ||
          ["i", "channel", "angle", "rhs", "shs", "chs"].includes(s.shape)
        ? "Steel-S355"
        : "C24";
  return lib.materials.find((m) => m.id === id) || lib.materials.find((m) => m.id === "C24") || lib.materials[0];
}
function compatible(s: Section, m: Material) {
  if (/steel/i.test(m.family))
    return (
      /(?:^|\s)(?:ipe|he[abm]|upn|shs|rhs|chs|steel|equal l)(?:\s|$)/i.test(s.family + " " + s.id) ||
      ["i", "channel", "angle", "rhs", "shs", "chs"].includes(s.shape)
    );
  if (/concrete/i.test(m.family)) return false;
  return /sawn|glulam|lvl|timber|wood/i.test(s.family);
}
function affinity(s: Section, m: Material) {
  return !compatible(s, m)
    ? 0
    : /glulam/i.test(m.family)
      ? /glulam/i.test(s.family)
        ? 20
        : 10
      : /sawn/i.test(s.family)
        ? 20
        : 10;
}
const guideNote =
  "Preliminary depth guide only: h ≈ L/20. The nearest catalogue depth is shown; loads, stiffness, width, thickness, stability and code checks have not sized this section. You can type any exact size instead.";
function depthCompare(a: Section, b: Section, target: number) {
  return Math.abs(a.h - target) - Math.abs(b.h - target) || a.A - b.A || a.b - b.b || a.id.localeCompare(b.id);
}
/** One nearest-depth catalogue candidate per compatible family; no material or geometry is altered. */
export function startingSections(lib: Library, material: Material, spanMetres?: number) {
  if (!spanMetres || !Number.isFinite(spanMetres) || spanMetres <= 0) return [];
  const target = spanMetres * 50,
    groups = new Map<string, Section[]>();
  for (const s of lib.sections.filter((s) => compatible(s, material))) {
    const family = sectionFamily(s);
    groups.set(family, [...(groups.get(family) || []), s]);
  }
  return [...groups.values()]
    .map((ss) => ss.sort((a, b) => depthCompare(a, b, target))[0])
    .sort(
      (a, b) =>
        affinity(b, material) - affinity(a, material) ||
        (["IPE", "HEA", "HEB", "HEM", "UPN", "SHS", "RHS", "CHS", "Equal L"].indexOf(sectionFamily(a)) + 1 || 99) -
          (["IPE", "HEA", "HEB", "HEM", "UPN", "SHS", "RHS", "CHS", "Equal L"].indexOf(sectionFamily(b)) + 1 || 99) ||
        sectionFamily(a).localeCompare(sectionFamily(b)),
    );
}
export function smartChoices(
  query: string,
  lib: Library,
  context: {
    material: Material;
    section: Section;
    hasMaterial: boolean;
    hasSection: boolean;
    hasSpan?: boolean;
    spanMetres?: number;
    hasLoad?: boolean;
    point?: boolean;
    roof?: boolean;
    numberKind?: string;
    mode?: "analysis" | "formula";
    preferredMaterialID?: string;
  },
) {
  const typedTerm = query.split(",").at(-1)?.trim() || "";
  const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");
  let exactGeometry: Section | null = null;
  try {
    exactGeometry = parseSection(typedTerm, lib);
  } catch {
    /* Incomplete dimensions remain editable. */
  }
  const complete =
    !!materialFromText(typedTerm, lib) ||
    !!exactGeometry ||
    /^[+-]?[\d.]+\s*(?:kN\/m|N\/mm|N\/m|kN|N|mm|cm|m)$/i.test(typedTerm);
  const term = complete ? "" : typedTerm,
    rows: Choice[] = [];
  const add = (
    title: string,
    value: string,
    group: string,
    hint = "",
    replace = !!term,
    explanation?: string,
    commit = true,
  ) => rows.push({ title, value, group, hint, replace, explanation, commit });
  const target =
    context.spanMetres && Number.isFinite(context.spanMetres) && context.spanMetres > 0
      ? context.spanMetres * 50
      : undefined;
  const depthHint = (s: Section) =>
    target ? `${sectionFamily(s)}; h ${s.h} mm; guide ${Number(target.toFixed(1))} mm` : `${s.b} × ${s.h} mm`;
  const numeric = term.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if (numeric) {
    const n = numeric[1],
      units: Record<string, [string, string]> = {
        L: ["m", "Span"],
        span: ["m", "Span"],
        P: ["kN", "Point force"],
        N: ["kN", "Axial force"],
        M: ["kNm", "Bending moment"],
        q: ["kN/m", "Distributed load"],
        E: ["MPa", "Elastic modulus"],
        I: ["mm4", "Second moment"],
        dT: ["K", "Temperature difference"],
      };
    if (context.numberKind && units[context.numberKind]) {
      const [unit, hint] = units[context.numberKind];
      add(`${n} ${unit}`, `${context.numberKind === "dT" ? "dT=" : ""}${n}${unit}`, "Interpret number", hint);
      return rows;
    }
    if (context.numberKind === "dimension") return rows;
    if (!context.hasSpan && context.mode !== "formula") add(`${n} m`, `${n}m`, "Interpret number", "Span");
    else {
      add(`${n} kN/m`, `${n}kN/m`, "Interpret number", "Distributed load");
      add(`${n} kN`, `${n}kN`, "Interpret number", "Point force");
      if (context.point) add(`At ${n} m`, `at ${n}m`, "Interpret number", "Point position");
    }
    return rows;
  }
  const knownFamily = lib.sections.some((s) => sectionFamily(s).toLowerCase() === term.toLowerCase());
  if (
    term &&
    context.mode !== "formula" &&
    !knownFamily &&
    !/^(concrete|timber|wood|steel|glulam|sawn|lvl|rect(?:angle)?|circle)(?:\s|$)/i.test(term)
  ) {
    for (const [label, value] of [
      ["Simply supported", "simply"],
      ["Cantilever", "cantilever"],
      ["Fixed ends", "fixed"],
      ["Propped cantilever", "propped"],
      ["Continuous spans", "continuous"],
      ["Inclined beam", "angled"],
      ["Roof rafters", "rafter"],
      ["Axial truss", "truss"],
    ])
      if (fuzzyScore(term, value) || fuzzyScore(term, label) || (term.toLowerCase() === "simpyl" && value === "simply"))
        add(label, value, "System");
    for (const d of ["global down", "global up", "local down", "local up", "projected", "member"])
      if (fuzzyScore(term, d) || (term.length >= 3 && d.startsWith(term.toLowerCase())))
        add(d, d, "Load direction", d === "projected" ? "UDL per horizontal metre" : "");
  }
  const families = [...new Set(lib.sections.map(sectionFamily))];
  const familyMatch = families.find((f) => f.toLowerCase() === term.toLowerCase());
  const materialMatch = term.match(/^(timber|wood|sawn|glulam|lvl|steel|concrete)(?:\s+(.*))?$/i);
  const materialWord = !!materialMatch && !(context.hasMaterial && familyMatch);
  if (term && !familyMatch && !materialWord && !/\d/.test(term))
    for (const f of families)
      if (fuzzyScore(term, f) > 0) add(f, f, "Section families", "Enter to see sizes", true, undefined, false);
  if ((!term && !context.hasMaterial) || materialWord || (term && !familyMatch && !/[x×]/.test(term))) {
    const family = materialMatch?.[1].toLowerCase(),
      gradeTerm = materialMatch?.[2] || (materialWord ? "" : term);
    const preferred =
      family === "concrete"
        ? "C30/37"
        : family === "glulam"
          ? "GL24h"
          : family === "steel"
            ? "Steel-S355"
            : family === "sawn" || family === "timber" || family === "wood"
              ? "C24"
              : context.preferredMaterialID || preferredMaterial(context.section, lib).id;
    const ranked = lib.materials
      .filter((m) => m.E && m.status !== "TEMPLATE" && !["CLT", "Panel"].includes(m.family))
      .filter(
        (m) =>
          !family ||
          (["timber", "wood"].includes(family) ? /sawn|glulam|lvl/i.test(m.family) : m.family.toLowerCase() === family),
      )
      .map((m) => ({
        m,
        score: gradeTerm ? fuzzyScore(gradeTerm, cleanMaterialName(m)) : m.id === preferred ? 200 : 1,
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    ranked
      .slice(0, 6)
      .forEach(({ m }) => add(cleanMaterialName(m), m.id, `Material / ${m.family}`, `E ${m.E} MPa`, !!term));
  }
  if (familyMatch || (term && !materialWord && !/^(rect(?:angle)?|circle)$/i.test(term))) {
    const scores = lib.sections
      .map((s) => ({
        s,
        score: familyMatch
          ? Number(sectionFamily(s) === familyMatch) * 100
          : Math.max(fuzzyScore(term, s.id), fuzzyScore(term, cleanSectionName(s))),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || (target ? depthCompare(a.s, b.s, target) : a.s.h - b.s.h || a.s.t - b.s.t));
    scores
      .slice(0, 9)
      .forEach(({ s }, i) =>
        add(
          cleanSectionName(s),
          s.id,
          `Section / ${sectionFamily(s)}`,
          i === 0 && target ? `First suggestion; h ≈ L/20` : depthHint(s),
          true,
          target ? guideNote : undefined,
        ),
      );
  }
  if (/^(rect(?:angle)?|circle)$/i.test(term)) {
    const h = Math.max(1, Math.round(target || 300)),
      shape = /^circle$/i.test(term) ? "circle" : "rect";
    const value = shape === "circle" ? `circle ${h}` : `rect 100x${h}`;
    add(
      value.replace(/^rect /, ""),
      value,
      "Section dimensions",
      target ? "First suggestion; h ≈ L/20" : "Example dimensions",
      true,
      `${guideNote} Rectangle width 100 mm is an editable example, not a sizing rule.`,
    );
  }
  if (!term && context.hasMaterial && !context.hasSection) {
    if (target) {
      const group = `Starting sizes / L/20 ≈ ${Number(target.toFixed(1))} mm`;
      if (context.material.family !== "Steel")
        add(
          `100 × ${Math.round(target)} mm`,
          `rect 100x${Math.max(1, Math.round(target))}`,
          group,
          "Rectangle; editable width and height",
          false,
          guideNote + " Width 100 mm is an example.",
        );
      startingSections(lib, context.material, context.spanMetres).forEach((s) =>
        add(cleanSectionName(s), s.id, group, depthHint(s), false, guideNote),
      );
    }
    const shapes = () => {
      add("Rectangle", "rect", "Section shapes", "Enter dimensions or accept a starting size", false, undefined, false);
      add("Circle", "circle", "Section shapes", "Enter diameter or accept a starting size", false, undefined, false);
    };
    if (context.material.family === "Concrete") shapes();
    families.sort(
      (a, b) =>
        Math.max(...lib.sections.filter((s) => sectionFamily(s) === b).map((s) => affinity(s, context.material))) -
        Math.max(...lib.sections.filter((s) => sectionFamily(s) === a).map((s) => affinity(s, context.material))),
    );
    families.slice(0, 12).forEach((f) => add(f, f, "Section families", "Enter to see sizes", false, undefined, false));
    if (context.material.family !== "Concrete") shapes();
  }
  if (!term && context.hasLoad) {
    if (context.point)
      ["at 50%", "at 40%", "at 2m"].forEach((v) => add(v, v, "Point position", "Measured from member start", false));
    if (context.roof)
      ["global down", "local down", "projected", "member"].forEach((v) => add(v, v, "Load direction", "", false));
  }
  return rows;
}
