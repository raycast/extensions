import { PropertyGroup, SectionProperty, propertyGroups, sectionPropertyValues } from "../core/section-properties";
import { Section } from "../core/types";
import { sectionDrawing } from "./drawings";
import { equation } from "./equations";
import { fmt } from "./state";
export function sectionPropertiesMarkdown(
  s: Section,
  group: PropertyGroup | "all" = "all",
  property?: string,
  details = true,
) {
  const all = sectionPropertyValues(s),
    rows = all.filter((p) => (group === "all" || p.group === group) && (!property || p.key === property));
  if (!rows.length) return `**${s.id}**\n\nChoose a category with available properties.`;
  const header = `**${s.id}**\n\n![Section and separate dimensions](${sectionDrawing(s)})\n\nAxes: y is horizontal and z is vertical in the section; x runs along the member. \n\n`;
  const table = (items: SectionProperty[]) =>
    `| Symbol / aliases | Property | Value |\n|---|---|---:|\n${items.map((p) => `| ${p.symbol}${p.aliases ? " (" + p.aliases + ")" : ""} | ${p.name} | **${fmt(p.value)} ${p.unit}** |`).join("\n")}`;
  const learn = (p: SectionProperty) =>
    `### ${p.symbol} — ${p.name}\n\n**${fmt(p.value)} ${p.unit}**${p.aliases ? " · Aliases: " + p.aliases : ""}\n\n**Meaning:** ${p.meaning}\n\n**When to use:** ${p.use}\n\n${equation(p.tex)}\n\n${p.code ? "**Design-reference example:** " + p.code + "\n\n" + (p.codeTex ? equation(p.codeTex) + "\n\n" : "") : ""}**Value basis:** ${p.origin}.\n\n`;
  if (property) {
    const p = rows[0];
    return `**${p.symbol} — ${p.name}**\n\n**${fmt(p.value)} ${p.unit}**${p.aliases ? " · Aliases: " + p.aliases : ""}\n\n${p.tex
      .split(/,?\\quad/)
      .map((tex) => equation(tex.trim()))
      .join(
        "\n\n",
      )}\n\n![Section](${sectionDrawing(s)})\n\n**Meaning:** ${p.meaning}\n\n**When to use:** ${p.use}\n\n${p.code ? "**Design-reference example:** " + p.code + "\n\n" + (p.codeTex ? equation(p.codeTex) + "\n\n" : "") : ""}**Value basis:** ${p.origin}.\n\nAxes: y is horizontal and z vertical in the section; x is the member axis.\n\n${codeNote(rows)}\n\nSource: ${s.source}`;
  }
  return (
    header +
    propertyGroups
      .filter((g) => rows.some((p) => p.group === g))
      .map((g) => "### " + g + "\n\n" + table(rows.filter((p) => p.group === g)))
      .join("\n\n") +
    `\n\n${details ? (group === "all" ? "Select a category above, then a property on the left for its equation, physical meaning and use." : rows.map(learn).join("\n\n")) : ""}\n\n${codeNote(rows)}\n\n${s.notes}\n\nSource: ${s.source}`
  );
}
function codeNote(rows: SectionProperty[]) {
  return rows.some((p) => p.code)
    ? "Code equations are learning references using the first-generation EN 1993-1-1 clause numbering (2005). They are not calculated resistance checks. Section class, loading, restraints, connection rules, applicable edition and National Annex must be established separately. Energy shear area As and code plastic shear area Av remain separate. [Steel member design reference](https://steelconstruction.info/topics/design/member-design)."
    : "";
}
