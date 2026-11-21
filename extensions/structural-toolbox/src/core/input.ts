import { Library, fuzzyScore, materialFromText } from "./library";
import { customSection } from "./sections";
import { Material, Section, Shape } from "./types";
import { Template } from "./templates";
export function quantity(
  text: string,
  kind: "length" | "section" | "force" | "line" | "modulus" | "moment" | "area",
): number {
  text = text.replace(/−/g, "-");
  const clean = text.trim().replace(/\s+/g, "").replace(/²/g, "2").replace(/³/g, "3");
  const match = clean.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)([a-z0-9/^]*)$/i);
  if (!match) throw Error(`Invalid value “${text}”. Use decimal points and explicit units.`);
  const v = Number(match[1]),
    u = match[2].toLowerCase();
  const scales: Record<typeof kind, Record<string, number>> = {
    length: { "": 1, m: 1, mm: 0.001, cm: 0.01 },
    section: { "": 1, mm: 1, cm: 10, m: 1000 },
    force: { "": 1, kn: 1, n: 0.001 },
    line: { "": 1, "kn/m": 1, "n/mm": 1, "n/m": 0.001 },
    modulus: { "": 1, mpa: 1, gpa: 1000, "n/mm2": 1 },
    moment: { "": 1, knm: 1, "kn*m": 1, nmm: 1e-6 },
    area: { "": 1, mm2: 1, cm2: 100, m2: 1e6 },
  };
  if (!(u in scales[kind])) throw Error(`Unsupported unit “${u}” for ${kind}`);
  if (!Number.isFinite(v)) throw Error("Value must be finite");
  return v * scales[kind][u];
}
export function spansInput(text: string): number[] {
  const parts = text.trim().split("/");
  const trailing = parts.at(-1)!.match(/(mm|cm|m)\s*$/i)?.[1] ?? "";
  return parts.map((p) => quantity(/[a-z]/i.test(p) ? p : p + trailing, "length"));
}
const shapeAliases: Record<string, Shape> = {
  rect: "rectangle",
  rectangle: "rectangle",
  round: "circle",
  circle: "circle",
  rhs: "rhs",
  shs: "shs",
  chs: "chs",
  tube: "chs",
  pipe: "chs",
  i: "i",
  ibeam: "i",
  tee: "t",
  t: "t",
  channel: "channel",
  c: "channel",
  angle: "angle",
  l: "angle",
};
export function parseSection(text: string, lib: Library): Section | null {
  const exact = lib.sections.find(
    (s) => s.id.toLowerCase().replace(/\s/g, "") === text.trim().toLowerCase().replace(/\s/g, ""),
  );
  if (exact) return exact;
  if (/^\d+(?:\.\d+)?\s*[x×]\s*\d/.test(text.trim())) return parseSection("rect " + text, lib);
  const match = text.trim().match(/^([a-z]+)(?:\s+|(?=[\d.]))(.*)$/i);
  if (!match) return null;
  let shape = shapeAliases[match[1].toLowerCase()];
  if (!shape && match[1].length >= 3 && !/^(ipe|hea|heb|hem|upn)$/i.test(match[1])) {
    const candidates = Object.entries(shapeAliases)
      .filter(([name]) => name.length >= 3)
      .map(([name, value]) => ({ value, score: fuzzyScore(match[1], name) }))
      .filter((v) => v.score >= 20)
      .sort((a, b) => b.score - a.score);
    if (
      candidates.length &&
      candidates.filter((v) => v.score === candidates[0].score).every((v) => v.value === candidates[0].value)
    )
      shape = candidates[0].value;
  }
  if (!shape) return null;
  let rest = match[2].replace(/×/g, "x");
  const unit = rest.match(/(mm|cm|m)\s*$/i)?.[1] ?? "";
  rest = rest.replace(/(mm|cm|m)\s*$/i, "");
  const named = [...rest.matchAll(/\b(tw|tf|h|b|t|d|r)\s*=?\s*([\d.]+)\s*(mm|cm|m)?/gi)];
  if (named.length) {
    const names = named.map((m) => m[1].toLowerCase());
    if (new Set(names).size !== names.length) throw Error("Duplicate named dimension");
    let unused = rest;
    for (const m of named) unused = unused.replace(m[0], "");
    if (unused.trim()) throw Error(`Unrecognized dimension input: ${unused.trim()}`);
  }
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
  let vals: number[];
  if (named.length) {
    const values = Object.fromEntries(
      named.map((m) => [m[1].toLowerCase(), quantity(m[2] + (m[3] || unit), "section")]),
    );
    if (values.r !== undefined && shape === "circle") values.d = 2 * values.r;
    if (shape === "shs" && values.b !== undefined && values.h === undefined) values.h = values.b;
    vals = keys[shape].map((k) => {
      if (values[k] === undefined) throw Error(`Enter ${k} for ${shape}`);
      return values[k];
    });
  } else
    vals = rest
      .split(/\s*x\s*|\s+/)
      .filter(Boolean)
      .map((v) => quantity(v + unit, "section"));
  const counts: Record<Shape, number> = {
    rectangle: 2,
    circle: 1,
    rhs: 3,
    shs: 2,
    chs: 2,
    i: 4,
    t: 4,
    channel: 4,
    angle: 4,
  };
  if (vals.length !== counts[shape])
    throw Error(`${shape}: expected ${counts[shape]} dimensions. RHS uses h × b × t; rectangle uses b × h.`);
  return customSection(shape, vals);
}
export interface Quick {
  pendingSection?: { shape: Shape; values: number[] };
  section?: Section;
  material?: Material;
  spans?: number[];
  template?: Template;
  pitch?: number;
  q?: number;
  P?: number;
  loadSense?: "up" | "down";
  spanCount?: number;
  direction?: "globalX" | "globalZ" | "localZ";
  basis?: "member" | "projected";
  pointPosition?: string;
  pointMember?: string;
  E?: number;
  G?: number;
  messages: string[];
  unresolved: string[];
}
export function stripInputAnnotations(text: string) {
  return text.replace(
    /\(\s*(?:system|span|spans|each span|width|UDL|point load|joint load|section|material|position|angle|direction|basis|inertia|fibre distance|area|moment|axial force|shear force|effective-length factor)\s*\)/gi,
    "",
  );
}
export function parseQuick(text: string, lib: Library): Quick {
  text = stripInputAnnotations(text);
  const out: Quick = { messages: [], unresolved: [] };
  const parts = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    chunks: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const shape = shapeAliases[parts[i].toLowerCase()];
    if (shape) {
      const count = {
          rectangle: 2,
          circle: 1,
          rhs: 3,
          shs: 2,
          chs: 2,
          i: 4,
          t: 4,
          channel: 4,
          angle: 4,
        }[shape],
        values: number[] = [];
      while (values.length < count && i + 1 < parts.length && /^[\d.]+\s*(mm|cm|m)?$/i.test(parts[i + 1])) {
        try {
          values.push(quantity(parts[++i], "section"));
        } catch {
          break;
        }
      }
      if (values.length === count) chunks.push(shape + " " + values.join("x"));
      else out.pendingSection = { shape, values };
    } else chunks.push(parts[i]);
  }
  let loadSense: "up" | "down" | undefined;
  let equalLength: number | undefined;
  const loadNumber = (text: string, kind: "force" | "line") => {
    const n = quantity(text, kind);
    return /^[+\-−]/.test(text.trim()) ? n : -Math.abs(n);
  };
  for (const chunk of chunks) {
    try {
      const k = chunk
        .toLowerCase()
        .trim()
        .replace(/−/g, "-")
        .replace(/^(global|local)([xz])$/, "$1 $2");
      const count = k.match(/^(?:continuous|cont)\s+(\d+)\s*(?:spans?)?$/);
      if (count) {
        out.template = "continuous";
        out.spanCount = Number(count[1]);
        if (out.spanCount < 2 || out.spanCount > 5) throw Error("Continuous beams support 2 to 5 spans");
        continue;
      }
      const each = k.match(/^(.+?)\s+each$/);
      if (each) {
        equalLength = quantity(each[1], "length");
        continue;
      }
      const at = k.match(/^at\s+(.+)$/);
      if (at) {
        out.pointPosition = at[1];
        continue;
      }
      const member = k.match(/^(?:span|member)\s+(\d+)$/);
      if (member) {
        out.pointMember = "M" + member[1];
        continue;
      }
      if (k === "left rafter" || k === "right rafter") {
        out.pointMember = k === "left rafter" ? "M1" : "M2";
        continue;
      }
      const direction = k.match(/^(global|local)(?:\s+([xz]))?(?:\s+(up|down|left|right))?$/);
      if (direction) {
        out.direction =
          direction[1] === "local"
            ? "localZ"
            : direction[2] === "x" || ["left", "right"].includes(direction[3])
              ? "globalX"
              : "globalZ";
        if (direction[3]) loadSense = ["up", "right"].includes(direction[3]) ? "up" : "down";
        continue;
      }
      if (["gravity", "vertical", "vertical down", "-z", "z-", "global -z"].includes(k)) {
        out.direction = "globalZ";
        loadSense = "down";
        continue;
      }
      if (["z", "+z", "z+", "global +z"].includes(k)) {
        out.direction = "globalZ";
        loadSense = "up";
        continue;
      }
      if (["normal", "normal down", "local -z"].includes(k)) {
        out.direction = "localZ";
        loadSense = "down";
        continue;
      }
      if (["up", "down"].includes(k)) {
        loadSense = k as "up" | "down";
        continue;
      }
      if (["projected", "projection", "projective", "horizontal projection", "per horizontal metre"].includes(k)) {
        out.basis = "projected";
        continue;
      }
      if (["member", "per member metre", "along member"].includes(k)) {
        out.basis = "member";
        continue;
      }
      if (/^[+\-−]?[\d.]+\s*(?:kn\/m|n\/mm|n\/m)$/i.test(k)) {
        if (out.q !== undefined)
          throw Error("A UDL is already entered. Use Advanced Nodes and Loads for multiple distributed loads.");
        out.q = loadNumber(chunk, "line");
        continue;
      }
      if (/^[+\-−]?[\d.]+\s*(?:kn|n)$/i.test(k)) {
        if (out.P !== undefined)
          throw Error("A point load is already entered. Use Advanced Nodes and Loads for multiple point loads.");
        out.P = loadNumber(chunk, "force");
        continue;
      }
      const directMaterial = materialFromText(chunk, lib);
      if (directMaterial) {
        out.material = directMaterial;
        continue;
      }
      const section = parseSection(chunk, lib);
      if (section) {
        out.section = section;
        continue;
      }
      const key = chunk.toLowerCase();
      const material = lib.materials.find(
        (m) =>
          m.id.toLowerCase().replace(/\s/g, "") === key.replace(/\s/g, "") || m.id.toLowerCase() === "steel-" + key,
      );
      if (material) {
        out.material = material;
        continue;
      }
      if (["timber", "wood", "steel", "glulam", "concrete"].includes(key)) {
        out.unresolved.push(`Choose a specific ${key} preset`);
        continue;
      }
      if (/^(e|g)\s*=?\s*[\d.]/i.test(chunk)) {
        const m = chunk.match(/^(e|g)\s*=?\s*(.*)$/i)!;
        out[m[1].toUpperCase() as "E" | "G"] = quantity(m[2], "modulus");
        continue;
      }
      if (/^(q|udl)\s*=?\s*/i.test(chunk)) {
        if (out.q !== undefined)
          throw Error("A UDL is already entered. Use Advanced Nodes and Loads for multiple distributed loads.");
        out.q = loadNumber(chunk.replace(/^(q|udl)\s*=?\s*/i, ""), "line");
        continue;
      }
      if (/^(point|p)\s*=?\s*(?=[+-]?[\d.])/i.test(chunk)) {
        if (out.P !== undefined)
          throw Error("A point load is already entered. Use Advanced Nodes and Loads for multiple point loads.");
        out.P = loadNumber(chunk.replace(/^(point|p)\s*=?\s*/i, ""), "force");
        continue;
      }
      if (/^(pitch|angle)\s*=?\s*(?=[+\-]?[\d.])/i.test(chunk)) {
        const v = Number(chunk.replace(/^(pitch|angle)\s*=?\s*(?=[+\-]?[\d.])/i, "").replace(/deg|°/gi, ""));
        if (!Number.isFinite(v)) throw Error("Enter pitch in degrees");
        out.pitch = v;
        continue;
      }
      if (/^(spans?|l)\s*=?\s*/i.test(chunk) || /^[\d.]+(?:\s*\/\s*[\d.]+)*(?:mm|cm|m)?$/i.test(chunk)) {
        if (out.spans)
          throw Error("Use / between continuous span lengths, for example 4/5/4m. Use at 2m for a point position.");
        out.spans = spansInput(chunk.replace(/^(spans?|l)\s*=?\s*/i, ""));
        continue;
      }
      const names: Record<string, Template> = {
        "simply supported": "simple",
        simple: "simple",
        simply: "simple",
        simpyl: "simple",
        simp: "simple",
        cont: "continuous",
        angled: "inclined",
        "truss rafter": "roof",
        "rafter frame": "roof",
        ss: "simple",
        continuous: "continuous",
        cantilever: "cantilever",
        cant: "cantilever",
        fixed: "fixed",
        "fixed fixed": "fixed",
        propped: "propped",
        inclined: "inclined",
        rafter: "roof",
        roof: "roof",
        truss: "truss",
      };
      const ranked = Object.entries(names)
        .map(([k, v]) => ({ v, score: fuzzyScore(key, k) }))
        .sort((a, b) => b.score - a.score);
      if (ranked[0]?.score >= 20) {
        out.template = ranked[0].v;
        continue;
      }
      out.unresolved.push(chunk);
    } catch (e) {
      out.messages.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (equalLength !== undefined) {
    if (!out.spanCount) out.messages.push("Specify the span count, for example continuous 5, 4m each");
    else out.spans = Array(out.spanCount).fill(equalLength);
  }
  if (out.spanCount && out.spans && out.spans.length !== out.spanCount)
    out.messages.push(`Enter ${out.spanCount} lengths, or use 4m each`);
  if (out.spans && out.spans.length > 1 && !out.template) out.template = "continuous";
  if (out.template === "continuous" && out.spans && out.spans.length < 2)
    out.messages.push("Enter at least two lengths, for example 4/5m, or continuous 5, 4m each");
  if (loadSense) {
    out.loadSense = loadSense;
    if (out.q !== undefined) out.q = Math.abs(out.q) * (loadSense === "up" ? 1 : -1);
    if (out.P !== undefined) out.P = Math.abs(out.P) * (loadSense === "up" ? 1 : -1);
  }
  return out;
}

/** Position within a member: public distances in metres; ratios dimensionless. */
export function pointLocation(text: string): {
  position?: number;
  ratio?: number;
  horizontal?: number;
} {
  const clean = text.trim().toLowerCase();
  if (!clean) return { ratio: 0.5 };
  if (clean === "center" || clean === "centre" || clean === "midspan") return { ratio: 0.5 };
  const ratio = clean.match(/^([\d.]+)\s*(%|l)$/);
  if (ratio) {
    const value = Number(ratio[1]) / (ratio[2] === "%" ? 100 : 1);
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw Error("Position ratio must be between 0 and 1, or 0% and 100%");
    return { ratio: value };
  }
  if (clean.startsWith("horizontal ")) return { horizontal: quantity(clean.slice(11), "length") };
  return { position: quantity(clean, "length") };
}
