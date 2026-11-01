import { Material, Portrait } from "./api";

const line = (label: string, values: string[]) => (values.length ? `**${label}:** ${values.join(", ")}\n\n` : "");

export function portraitMarkdown(p: Portrait): string {
  let md = `# ${p.name}\n\n_${p.house}_\n\n${p.lede}\n\n`;
  if (p.character) md += `${p.character}\n\n`;
  if (p.pyramid) {
    md += "## Notes\n\n";
    md += line("Top", p.pyramid.top) + line("Heart", p.pyramid.heart) + line("Base", p.pyramid.base);
  } else if (p.notes.length) {
    md += `## Notes\n\n${p.notes.join(", ")}\n\n`;
  }
  md += line("Signature materials", p.signatureMaterials);
  return md.trimEnd();
}

export function materialMarkdown(m: Material): string {
  let md = `# ${m.name}\n\n${m.lede}\n\n`;
  if (m.smellsLike) md += `## Smells like\n\n${m.smellsLike}\n\n`;
  md += line("Pairs well with", m.pairsWellWith);
  if (m.showcasedIn.length) {
    md += "## Showcased in\n\n";
    md += m.showcasedIn.map((s) => `- ${s.name} by ${s.house} (${s.tier} note)`).join("\n");
    md += "\n";
  }
  return md.trimEnd();
}
