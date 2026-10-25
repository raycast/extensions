import { Quick } from "./input";
import { Shape } from "./types";
export const shapeFields: Record<Shape, string[]> = {
  rectangle: ["Width b", "Height h"],
  circle: ["Diameter d"],
  rhs: ["Height h", "Width b", "Thickness t"],
  shs: ["Side", "Thickness t"],
  chs: ["Diameter d", "Thickness t"],
  i: ["Height h", "Width b", "Web tw", "Flange tf"],
  t: ["Height h", "Width b", "Web tw", "Flange tf"],
  channel: ["Height h", "Width b", "Web tw", "Flange tf"],
  angle: ["Height h", "Width b", "Leg tw", "Leg tf"],
};
export const shapeDefaults: Record<Shape, number[]> = {
  rectangle: [100, 300],
  circle: [100],
  rhs: [200, 100, 6],
  shs: [100, 6],
  chs: [114.3, 5],
  i: [300, 150, 8, 12],
  t: [200, 150, 8, 12],
  channel: [200, 100, 8, 12],
  angle: [100, 100, 8, 8],
};
export interface Guidance {
  title: string;
  hint: string;
  placeholder: string;
  value?: string;
  replace?: boolean;
  kind: "system" | "section" | "span" | "pitch" | "direction" | "load" | "material" | "ready" | "error";
}
export function analysisGuidance(
  query: string,
  q: Quick,
  c: {
    spans: string;
    pitch: string;
    q: string;
    pointValue: string;
    jointLoad: string;
    template: string;
    confirmed?: {
      system: boolean;
      material: boolean;
      section: boolean;
      direction?: boolean;
    };
  },
): Guidance {
  const term = query.split(",").at(-1)?.trim() || "";
  if (q.pendingSection) {
    const { shape, values } = q.pendingSection,
      index = values.length,
      label = shapeFields[shape][index],
      value =
        c.spans && ((shape === "rectangle" && index === 1) || (shape !== "rectangle" && index === 0))
          ? Math.max(1, Math.round(Math.max(...c.spans.split("/").map(Number)) * 50))
          : shapeDefaults[shape][index];
    return {
      kind: "section",
      title: `Enter ${label.toLowerCase()} in mm`,
      hint: `Type ${value}, or enter your dimension. ${values.length ? "Entered dimensions: " + values.join(" × ") + " mm." : ""}`,
      placeholder: `Type ${label.toLowerCase()}, for example ${value}`,
      value: String(value),
    };
  }
  if (/^(timber|wood|glulam|steel|concrete)$/i.test(term))
    return {
      kind: "material",
      title: "Choose a material grade",
      hint: `Select a ${term} grade below, then press Enter.`,
      placeholder: `Search ${term} grades`,
    };
  if (q.messages.length || q.unresolved.length)
    return {
      kind: "error",
      title: "Check the last input",
      hint: [...q.messages, ...q.unresolved.map((t) => `“${t}” was not recognized`)].join("; "),
      placeholder: "Use commas between values, for example 6m, 3kN/m, S355",
    };
  if (c.confirmed && !c.confirmed.system)
    return {
      kind: "system",
      title: "Choose the support system",
      hint: "Choose simply supported, cantilever, fixed ends, continuous spans or a roof system below.",
      placeholder: "simply, 6m, 3kN/m, C24, 100x300",
      value: "simply",
    };
  if (c.template === "continuous" && c.spans && c.spans.split("/").length < 2)
    return {
      kind: "span",
      title: "Enter at least two span lengths",
      hint: "Type 4/5m for two spans, or continuous 5, 4m each.",
      placeholder: "Type span lengths, for example 4/5/4m",
      value: "4/5/4m",
    };
  if (!c.spans)
    return {
      kind: "span",
      title: c.template === "continuous" ? "Enter span lengths" : "Enter the horizontal span",
      hint:
        c.template === "continuous"
          ? q.spanCount
            ? `Enter ${q.spanCount} lengths separated by /, or type 4m each.`
            : "Type 4/5/4m for unequal spans, or continuous 5, 4m each."
          : "Type 6m, or enter your span with mm, cm or m.",
      placeholder:
        c.template === "continuous"
          ? q.spanCount
            ? `Type ${q.spanCount} span lengths, or 4m each`
            : "Type span lengths, for example 4/5/4m"
          : "Type a span, for example 6m",
      value: c.template === "continuous" ? (q.spanCount ? Array(q.spanCount).fill(4).join("/") + "m" : "4/5/4m") : "6m",
    };
  if (
    ["roof", "truss", "inclined"].includes(c.template) &&
    (c.template === "inclined" ? !(Math.abs(Number(c.pitch)) > 0) : !(Number(c.pitch) > 0))
  )
    return {
      kind: "pitch",
      title: "Enter the inclination",
      hint: "Type pitch 30deg, or enter your angle in degrees.",
      placeholder: "Type an angle, for example pitch 30deg",
      value: "pitch 30deg",
    };
  if (
    ["roof", "inclined"].includes(c.template) &&
    !c.q &&
    !c.pointValue &&
    !c.jointLoad &&
    !q.direction &&
    !q.basis &&
    !c.confirmed?.direction
  )
    return {
      kind: "direction",
      title: "Choose the load direction",
      hint: "Choose global down, global up or normal to the member. For a distributed load, also choose whether its intensity is per member metre or per horizontal metre. Then enter the load value.",
      placeholder: "Choose a direction below, or type global down",
    };
  if ((!c.q && !c.pointValue && !c.jointLoad) || /^(q|udl|p|point)\s*=?$/i.test(term))
    return {
      kind: "load",
      title: c.template === "truss" ? "Enter a load at the ridge joint" : "Enter a load to calculate",
      hint:
        c.template === "truss"
          ? "Type 10kN for a downward load at the ridge. For between-joint loading choose a rafter frame."
          : "Type 3kN/m for a distributed load or 10kN for a point load. Point loads default to the selected member’s midpoint.",
      placeholder:
        c.template === "truss" ? "Type a joint load, for example 10kN" : "Type a load, for example 3kN/m or 10kN",
      value: c.template === "truss" ? "10kN" : /^(p|point)/i.test(term) ? "10kN" : "3kN/m",
      replace: /^(q|udl|p|point)\s*=?$/i.test(term),
    };
  if (c.confirmed && !c.confirmed.material)
    return {
      kind: "material",
      title: "Choose a material",
      hint: "Choose a grade below, or type timber, steel, glulam or concrete to filter the grades.",
      placeholder: "Type a grade, for example C24 or C30/37",
    };
  if (c.confirmed && !c.confirmed.section)
    return {
      kind: "section",
      title: "Choose a section",
      hint: "The first sizes use the nearest depth to L/20. Choose a family or type your exact dimensions, such as 100x300.",
      placeholder: "Type a section family or dimensions",
    };
  return {
    kind: "ready",
    title: "Results update as you type",
    hint: "Change a span, load or section. Use at 40% for a point position, global down for direction, or projected for horizontal-length UDL.",
    placeholder: "Change values, for example 6m, 3kN/m, IPE160, S355",
  };
}
