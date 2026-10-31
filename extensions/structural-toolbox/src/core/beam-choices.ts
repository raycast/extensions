import { Library } from "./library";
import { Choice, smartChoices } from "./smart-choices";
import { Quick, parseQuick } from "./input";
import { Guidance } from "./guidance";
import { Material, Section } from "./types";
const systems = [
  ["Simply supported", "simply", "Pin and roller"],
  ["Cantilever", "cantilever", "Fixed at one end"],
  ["Fixed ends", "fixed", "Fixed at both ends"],
  ["Propped cantilever", "propped", "Fixed end and roller"],
  ["Continuous spans", "continuous", "Two to five spans"],
  ["Inclined beam", "angled", "Enter inclination"],
  ["Roof rafters", "rafter", "Pinned eaves and hinged ridge"],
  ["Axial truss", "truss", "Joint loads"],
];
export function beamChoices(
  query: string,
  lib: Library,
  context: {
    stage: Guidance;
    quick: Quick;
    material: Material;
    section: Section;
    hasMaterial: boolean;
    hasSection: boolean;
    spanMetres?: number;
    hasSpan: boolean;
    hasLoad: boolean;
    point: boolean;
    roof: boolean;
    numberKind: string;
  },
): Choice[] {
  const tail = query.split(",").at(-1)?.trim() || "",
    parsed = parseQuick(tail, lib);
  const complete =
    !!tail &&
    !parsed.pendingSection &&
    !parsed.messages.length &&
    !parsed.unresolved.length &&
    !/^[+-]?[\d.]+$/.test(tail) &&
    !parsed.template &&
    (!!parsed.material ||
      !!parsed.section ||
      !!parsed.spans ||
      parsed.q !== undefined ||
      parsed.P !== undefined ||
      !!parsed.direction ||
      !!parsed.basis ||
      parsed.pitch !== undefined ||
      !!parsed.pointPosition ||
      parsed.E !== undefined ||
      parsed.G !== undefined);
  const searching = !!tail && !complete;
  const core = smartChoices(complete ? query + "," : query, lib, {
    ...context,
    mode: "analysis",
    preferredMaterialID: context.material.id,
  });
  if (searching && core.length) return core;
  const row = (title: string, value: string, group: string, hint = ""): Choice => ({
    title,
    value,
    group,
    hint,
    replace: false,
  });
  const stage = context.stage.kind;
  if (stage === "system") return systems.map(([title, value, hint]) => row(title, value, "1. System", hint));
  if (stage === "span")
    return [
      row(
        context.stage.value || "6m",
        context.stage.value || "6m",
        "2. Span",
        "Enter your span or accept this example",
      ),
    ];
  if (stage === "pitch") return [row("pitch 30deg", "pitch 30deg", "Inclination", "Enter your angle")];
  if (stage === "direction")
    return [
      row("Global down", "global down, member", "Load direction", "UDL per member metre"),
      row("Global down", "global down, projected", "Load direction", "UDL per horizontal metre"),
      row("Normal to member", "local down, member", "Load direction", "Local −z; UDL per member metre"),
      row("Global up", "global up, member", "Load direction", "UDL per member metre"),
      row("Global right", "global right, member", "Load direction", "Horizontal +X"),
      row("Global left", "global left, member", "Load direction", "Horizontal −X"),
    ];
  if (stage === "load")
    return context.quick.template === "truss"
      ? [row("10kN", "10kN", "3. Joint load", "Downward at ridge")]
      : [row("3kN/m", "3kN/m", "3. Load", "Uniform load"), row("10kN", "10kN", "3. Load", "Point load at midpoint")];
  if (stage === "material")
    return [
      ...core.filter((c) => c.group.startsWith("Material")),
      ...["timber", "steel", "glulam", "concrete"].map((value) => ({
        ...row(value[0].toUpperCase() + value.slice(1), value, "Material families", "Enter to see grades"),
        commit: false,
      })),
      ...core.filter((c) => c.group === "Point position" || c.group === "Load direction"),
    ];
  if (stage === "section") return core.filter((c) => !c.group.startsWith("Material"));
  return core.filter((c) => c.group === "Point position" || c.group === "Load direction");
}
