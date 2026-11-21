import { Formula, FormulaValues } from "./formulas";
import { FormulaInput, parseFormulaInput } from "./formula-input";
import { formulaPrimaryInputs } from "./formula-examples";
import { Library, fuzzyScore } from "./library";
import { Material, Section } from "./types";
import { Choice, smartChoices, cleanSectionName } from "./smart-choices";
import { engineeringFields } from "./engineering-input";
export interface FormulaStage {
  kind: "value" | "material" | "section" | "ready";
  key?: string;
  title: string;
  hint: string;
  needsMaterial: boolean;
  needsSection: boolean;
  ready: boolean;
}
export const scalarNames: Record<string, string> = {
  L: "Span",
  N: "Axial force",
  M: "Bending moment",
  P: "Shear force",
  q: "Distributed load",
  I: "Second moment of area",
  A: "Area",
  a: "Fibre distance",
  E: "Elastic modulus",
  W: "Section modulus",
  K: "Effective-length factor",
};
export const scalarExamples: Record<string, string> = {
  T: "T=1kNm",
  G: "G=80769MPa",
  torqueCase: "cantilever restrained",
  ltbCase: "uniform moment",
  L: "6m",
  N: "N=10kN",
  M: "M=20kNm",
  P: "V=10kN",
  q: "3kN/m",
  I: "I=1943cm4",
  A: "A=100cm2",
  a: "c=100mm",
  E: "E=11000MPa",
  W: "W=194cm3",
  K: "K=1",
};
export const formulaInputName = (f: Formula, key: string) =>
  key === "L" && f.id === "ltb"
    ? "Unbraced length Lb"
    : key === "L" && f.id.startsWith("torsion-")
      ? "Member length"
      : key === "a" && f.id === "torsion-warping"
        ? "Torque position from A"
        : key === "P"
          ? f.id === "rect-shear"
            ? "Shear force"
            : "Point load"
          : key === "a"
            ? f.id === "modulus"
              ? "Fibre distance"
              : "Position"
            : key === "torqueCase"
              ? "Torsion restraints"
              : key === "ltbCase"
                ? "LTB load and restraint case"
                : engineeringFields[key]?.title || scalarNames[key] || key;
export const formulaValueExample = (f: Formula, key: string) =>
  key === "P" && f.id !== "rect-shear" ? "10kN" : scalarExamples[key];
export function formulaStage(
  f: Formula,
  values: FormulaValues,
  explicit: Set<string>,
  confirmed: { material?: boolean; section?: boolean } = {},
): FormulaStage {
  const base = {
    needsMaterial: f.inputs.includes("E"),
    needsSection: f.inputs.some((k) => ["section", "I", "A", "W"].includes(k)),
    ready: false,
  };
  const value = (key: string): FormulaStage => ({
    ...base,
    kind: "value",
    key,
    title: "Enter " + formulaInputName(f, key).toLowerCase(),
    hint: "Type " + formulaValueExample(f, key) + ", or select it below. You can enter named values in any order.",
  });
  if (f.id === "torsion-warping" && !explicit.has("torqueCase")) return value("torqueCase");
  if (f.id === "ltb" && !explicit.has("ltbCase")) return value("ltbCase");
  for (const k of formulaPrimaryInputs(f)) if (!Number.isFinite(values[k] as number)) return value(k);
  const material = explicit.has("material") || explicit.has("E") || confirmed.material;
  const section = explicit.has("section") || confirmed.section;
  if (base.needsMaterial && !material)
    return {
      ...base,
      kind: "material",
      title: "Choose a material",
      hint: "Select a grade below, type timber, steel, glulam or concrete, or enter E directly.",
    };
  if (f.inputs.includes("G") && !(values.G! > 0)) return value("G");
  if (["modulus", "radius"].includes(f.id)) {
    if (!section) {
      if (!explicit.has("I"))
        return {
          ...base,
          kind: "section",
          title: "Choose a section or enter I",
          hint:
            "A section supplies matching properties. Alternatively type I=1943cm4, then " +
            (f.id === "modulus" ? "c=100mm." : "A=100cm2."),
        };
      const k = f.id === "modulus" ? "a" : "A";
      if (!explicit.has(k)) return value(k);
    }
  } else if (
    base.needsSection &&
    !section &&
    f.inputs.some((k) => ["section", "I", "A", "W"].includes(k) && !explicit.has(k))
  )
    return {
      ...base,
      kind: "section",
      title: "Choose a section",
      hint: "Select a family and size, type 100x300 or RHS200x100x6, or enter the required property directly.",
    };
  return {
    ...base,
    kind: "ready",
    ready: true,
    title: "Result updates as you type",
    hint: "Change any value, material or section. Named values can be entered in any order.",
  };
}
export function formulaChoices(
  query: string,
  f: Formula,
  lib: Library,
  c: {
    stage: FormulaStage;
    material: Material;
    section: Section;
    parsed: FormulaInput;
    values: FormulaValues;
    explicit: Set<string>;
    numberKey?: string;
  },
): Choice[] {
  const tail = query.split(",").at(-1)?.trim() || "";
  const last = parseFormulaInput(tail, f, lib, c.values.L);
  const complete = !!tail && !last.errors.length && last.provided.size > 0 && !/^[+-]?[\d.]+$/.test(tail);
  const searching = !!tail && !complete;
  const needsMaterial = c.stage.needsMaterial;
  const presets =
    f.id === "torsion-warping"
      ? [
          ["Cantilever fixed", "cantilever restrained"],
          ["Cantilever free", "cantilever free"],
          ["Fork, free warp", "fork free"],
          ["Both ends fixed", "both restrained"],
        ]
      : f.id === "ltb"
        ? [
            ["Uniform moment", "uniform moment"],
            ["Simply supported UDL", "udl"],
            ["Central point load", "point"],
            ["Custom coefficients", "custom coefficients"],
          ]
        : [];
  if (
    c.stage.key === "torqueCase" ||
    c.stage.key === "ltbCase" ||
    (searching && presets.some(([t, v]) => Math.max(fuzzyScore(tail, t), fuzzyScore(tail, v)) > 0))
  ) {
    return presets
      .filter(([t, v]) => !searching || Math.max(fuzzyScore(tail, t), fuzzyScore(tail, v)) > 0)
      .map(([title, value]) => ({
        title,
        value,
        group: "Choose the arrangement",
        hint: "Enter applies this case",
        replace: searching,
        commit: true,
      }));
  }
  const core = smartChoices(complete ? query + "," : query, lib, {
    material: c.material,
    section: c.section,
    hasMaterial: !needsMaterial || c.explicit.has("material") || c.explicit.has("E"),
    hasSection: c.explicit.has("section"),
    hasSpan: Number.isFinite(c.values.L),
    spanMetres: undefined,
    hasLoad: false,
    mode: "formula",
    numberKind: c.stage.key,
    preferredMaterialID: c.material.id,
  });
  const relevant = core.filter((r) => needsMaterial || !r.group.startsWith("Material"));
  const row = (title: string, value: string, group: string, hint = "", replace = false, commit = true): Choice => ({
    title,
    value,
    group,
    hint,
    replace,
    commit,
  });
  if (searching) {
    if (/^[+-]?[\d.]+$/.test(tail) && (c.numberKey || c.stage.key)) {
      const key = (c.numberKey || c.stage.key)!,
        n = tail,
        units: Record<string, string> = {
          T: "kNm",
          G: "MPa",
          L: "m",
          N: "kN",
          M: "kNm",
          P: "kN",
          q: "kN/m",
          I: "mm4",
          A: "mm2",
          a: "mm",
          E: "MPa",
          W: "mm3",
          K: "",
        };
      const prefix = key === "a" ? "c=" : key === "P" && f.id === "rect-shear" ? "V=" : key + "=";
      return [
        row(
          n + (units[key] ? " " + units[key] : ""),
          prefix + n + units[key],
          "Confirm value",
          formulaInputName(f, key),
          true,
        ),
      ];
    }
    if (/^[+-]?[\d.]+$/.test(tail)) return [];
    if (relevant.length) return relevant;
    if (
      c.stage.kind === "value" &&
      new RegExp("^" + (c.stage.key === "P" ? "[VP]" : c.stage.key) + "\\s*=?$", "i").test(tail)
    )
      return [
        row(
          formulaValueExample(f, c.stage.key!),
          formulaValueExample(f, c.stage.key!),
          "Next input",
          formulaInputName(f, c.stage.key!),
          true,
        ),
      ];
    return [];
  }
  if (c.stage.kind === "value")
    return [
      row(
        formulaValueExample(f, c.stage.key!),
        formulaValueExample(f, c.stage.key!),
        "Next input",
        formulaInputName(f, c.stage.key!),
      ),
    ];
  if (c.stage.kind === "material")
    return [
      ...core.filter((r) => r.group.startsWith("Material")),
      ...["timber", "steel", "glulam", "concrete"].map((value) =>
        row(value[0].toUpperCase() + value.slice(1), value, "Material families", "Enter to see grades", false, false),
      ),
    ];
  if (c.stage.kind === "section") {
    const sectionRows = core.filter((r) => !r.group.startsWith("Material"));
    const fallback: Choice = row(
      cleanSectionName(c.section),
      c.section.id.startsWith("Custom ") ? "rect " + c.section.b + "x" + c.section.h : c.section.id,
      "Current section",
      "Accept this size or choose another",
    );
    // Custom geometry IDs are not guaranteed parseable; use shape dimensions explicitly.
    if (c.section.shape === "rectangle") {
      fallback.value = c.section.b + "x" + c.section.h;
      fallback.title = c.section.b + " × " + c.section.h + " mm";
    }
    if (f.id === "rect-shear" && c.section.shape !== "rectangle") {
      fallback.title = "100 × 300 mm";
      fallback.value = "100x300";
    }
    if (f.id === "rect-shear")
      return [fallback, ...sectionRows.filter((r) => /Rectangle|rect|sawn|glulam/i.test(r.title + " " + r.value))];
    return [
      fallback,
      ...sectionRows,
      ...(["modulus", "radius"].includes(f.id)
        ? [row("I=1943cm4", "I=1943cm4", "Or enter properties", "Second moment of area")]
        : []),
    ];
  }
  if (f.id === "euler")
    return ["K=1", "K=0.5", "K=0.7", "K=2"].map((value) =>
      row(value, value, "Effective length", "Override K; choose restraint model explicitly"),
    );
  if (f.id === "torsion-warping")
    return [
      row(
        "Torque at midpoint",
        "at 0.5L",
        "Optional position",
        "Default is the tip for a cantilever; centre for two restrained ends",
      ),
      ...presets.map(([title, value]) => row(title, value, "Change restraints")),
    ];
  if (f.id === "ltb") return presets.map(([title, value]) => row(title, value, "Change load case"));
  return [];
}
