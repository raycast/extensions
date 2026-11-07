import { Formula, FormulaValues } from "./formulas";
import { Library, materialFromText } from "./library";
import { parseQuick, quantity, pointLocation, stripInputAnnotations } from "./input";
import { Material, Section } from "./types";
import { engineeringFields, engineeringKeys, engineeringIDs, engineeringKeywordValues } from "./engineering-input";
export interface FormulaInput {
  values: Partial<FormulaValues>;
  material?: Material;
  section?: Section;
  errors: string[];
  provided: Set<string>;
}
export const inputUnits: Record<string, string> = {
  L: "m",
  P: "kN",
  q: "kN/m",
  E: "MPa",
  I: "mm⁴",
  A: "mm²",
  W: "mm³",
  N: "kN",
  M: "kN·m",
  K: "—",
  a: "m",
};
export function inputUnit(f: Formula, k: string) {
  return k === "a" && f.id === "modulus" ? "mm" : engineeringFields[k]?.unit || inputUnits[k] || "";
}
export function formulaScalar(f: Formula, key: string, text: string): number {
  if (key === "zg") return quantity(text, "section");
  if (key === "T") return quantity(text.replace(/·|\*/g, ""), "moment") * 1e6;
  if (key === "L" || key === "a")
    return (
      quantity(text, key === "a" && f.id === "modulus" ? "section" : "length") *
      (key === "a" && f.id === "modulus" ? 1 : 1000)
    );
  if (["P", "N"].includes(key)) return quantity(text, "force") * 1000;
  if (key === "M") return quantity(text.replace(/·|\*/g, ""), "moment") * 1e6;
  if (key === "q") return quantity(text, "line");
  if (["E", "G", "E05", "G05", "fy", "fc", "fm"].includes(key)) return quantity(text, "modulus");
  if (key === "A") return quantity(text, "area");
  if (key === "I" || key === "W" || engineeringFields[key]?.power) {
    const power = engineeringFields[key]?.power || (key === "I" ? 4 : 3),
      clean = text.trim().replace(/⁶/g, "6").replace(/⁴/g, "4").replace(/³/g, "3").replace(/\^/g, "");
    const match = clean.match(/^([+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?)\s*(mm|cm|m)?([346])?$/i);
    if (!match || (match[3] && Number(match[3]) !== power))
      throw Error(`${key}: enter ${inputUnit(f, key)}, e.g. ${key === "I" ? "1943cm4" : "194cm3"}`);
    const value =
      Number(match[1]) * (match[2]?.toLowerCase() === "m" ? 1000 : match[2]?.toLowerCase() === "cm" ? 10 : 1) ** power;
    if (!Number.isFinite(value)) throw Error("Value must be finite");
    return value;
  }
  const value = Number(text.replace(/−/g, "-"));
  if (!Number.isFinite(value)) throw Error(`Enter numeric ${key}`);
  return value;
}
export function parseFormulaInput(text: string, f: Formula, library: Library, currentSpan?: number): FormulaInput {
  const out: FormulaInput = { values: {}, errors: [], provided: new Set() };
  const primary = f.inputs.filter((k) =>
    ["modulus", "radius"].includes(f.id)
      ? k !== "section"
      : !["section", "E", "G", "I", "A", "W", "K", "a"].includes(k),
  );
  let position = 0;
  let ratioPosition: number | undefined;
  for (const token of stripInputAnnotations(text)
    .split(",")
    .map((t) => t.trim()))
    try {
      if (!token) {
        position++;
        continue;
      }
      const materialMatch = materialFromText(token, library);
      if (materialMatch) {
        out.material = materialMatch;
        out.provided.add("material");
        continue;
      }
      const advanced = engineeringIDs.includes(f.id) || f.id === "euler";
      const keyword = token.toLowerCase().replace(/\s+/g, " ");
      const keywordValue = engineeringKeywordValues[keyword];
      if (advanced && keywordValue) {
        const key = Object.keys(keywordValue)[0];
        const allowed =
          key === "torqueCase"
            ? f.id === "torsion-warping"
            : key === "ltbCase" || key === "modulusBasis"
              ? f.id === "ltb"
              : f.id === "euler";
        if (!allowed) throw Error("That option is not used in this calculator");
        Object.assign(out.values, keywordValue);
        out.provided.add(key);
        continue;
      }
      const extra =
        advanced &&
        token.match(
          /^(alphaLT|alphaY|alphaZ|betaC|E05|G05|kLT|Ky|Kz|kw|C1|C2|Iw|Wt|Ww|J|T|G|fy|fc|fm|zg)\s*=?\s*(?=[+\-−]?[.\d])(.+)$/i,
        );
      if (extra) {
        const key = Object.keys(engineeringFields).find((k) => k.toLowerCase() === extra[1].toLowerCase())!;
        if (!f.inputs.includes(key as keyof FormulaValues) && !engineeringKeys(f.id).includes(key))
          throw Error(key + " is not used in this calculator");
        (out.values as any)[key] = formulaScalar(f, key, extra[2]);
        out.provided.add(key);
        continue;
      }
      if (/^at\s+/i.test(token) && f.inputs.includes("a")) {
        const loc = pointLocation(token.replace(/^at\s+/i, ""));
        if (loc.ratio !== undefined) {
          ratioPosition = loc.ratio;
        } else out.values.a = (loc.position ?? NaN) * 1000;
        out.provided.add("a");
        continue;
      }
      if (/^\d+(?:\.\d+)?\s*[x×]\s*\d/.test(token)) {
        out.section = parseQuick("rect " + token, library).section;
        out.provided.add("section");
        continue;
      }

      const exactMaterial = library.materials.find((m) => m.id.toLowerCase() === token.toLowerCase());
      if (exactMaterial) {
        out.material = exactMaterial;
        out.provided.add("material");
        continue;
      }
      const exactSection = library.sections.find(
        (s) => s.id.toLowerCase().replace(/\s/g, "") === token.toLowerCase().replace(/\s/g, ""),
      );
      if (exactSection) {
        out.section = exactSection;
        out.provided.add("section");
        continue;
      }
      const named = token.match(/^(span|point|udl|[LPEIAWNMKacqV])\s*=?\s*(?=[+\-−]?[.\d])(.+)$/i);
      if (named) {
        const raw = named[1],
          key =
            raw === "a" || raw.toLowerCase() === "c"
              ? "a"
              : raw.toLowerCase() === "span"
                ? "L"
                : raw.toLowerCase() === "point" || (raw.toUpperCase() === "V" && f.id === "rect-shear")
                  ? "P"
                  : raw.toLowerCase() === "udl"
                    ? "q"
                    : raw.toLowerCase() === "q"
                      ? "q"
                      : raw.toUpperCase();
        if (!f.inputs.includes(key as keyof FormulaValues) && !engineeringKeys(f.id).includes(key))
          throw Error(`${key} is not used here. Inputs: ${f.inputs.join(", ")}`);
        (out.values as Record<string, number>)[key] = formulaScalar(f, key, named[2]);
        out.provided.add(key);
        continue;
      }
      const q = parseQuick(token, library);
      if (q.section) {
        out.section = q.section;
        out.provided.add("section");
        continue;
      }
      if (q.material) {
        out.material = q.material;
        out.provided.add("material");
        continue;
      }
      if (/^[+\-−]?[.\d]/.test(token)) {
        const compact = token.toLowerCase().replace(/\s/g, "");
        const recognized = /k?n\/m$|n\/mm$/.test(compact)
          ? "q"
          : /k?n$/.test(compact)
            ? f.inputs.includes("P")
              ? "P"
              : "N"
            : /k?n[·*]?m$/.test(compact)
              ? f.inputs.includes("T")
                ? "T"
                : "M"
              : /(?:gpa|mpa)$/.test(compact)
                ? "E"
                : /(?:mm|cm|m)[⁴4]$/.test(compact)
                  ? "I"
                  : /(?:mm|cm|m)[³3]$/.test(compact)
                    ? "W"
                    : /(?:mm|cm|m)[²2]$/.test(compact)
                      ? "A"
                      : /(?:mm|cm|m)$/.test(compact) && (f.inputs.includes("L") || engineeringKeys(f.id).includes("L"))
                        ? "L"
                        : undefined;
        if (
          recognized &&
          (f.inputs.includes(recognized as keyof FormulaValues) || engineeringKeys(f.id).includes(recognized)) &&
          !out.provided.has(recognized)
        ) {
          (out.values as any)[recognized] = formulaScalar(f, recognized, token);
          out.provided.add(recognized);
          continue;
        }

        const order = [...primary, ...f.inputs.filter((k) => k !== "section" && !primary.includes(k))];
        while (position < order.length && out.provided.has(order[position])) position++;
        const key = order[position++];
        if (!key) throw Error("Too many values. Use named inputs shown in the table.");
        (out.values as Record<string, number>)[key] = formulaScalar(f, key, token);
        out.provided.add(key);
        continue;
      }
      if (q.pendingSection) throw Error(`Enter ${q.pendingSection.shape} dimensions; example rhs 200x100x6`);
      throw Error(`Unrecognized input “${token}”. Use the parameters shown in the table.`);
    } catch (e) {
      out.errors.push(e instanceof Error ? e.message : String(e));
    }
  if (ratioPosition !== undefined) {
    const L = out.values.L ?? currentSpan;
    if (Number.isFinite(L)) out.values.a = L! * ratioPosition;
    else out.errors.push("Enter the span to use a ratio position");
  }
  return out;
}
export function displayInput(f: Formula, key: string, v: number) {
  return ["L", "P", "N"].includes(key) || (key === "a" && f.id !== "modulus")
    ? v / 1000
    : key === "M" || key === "T"
      ? v / 1e6
      : v;
}
