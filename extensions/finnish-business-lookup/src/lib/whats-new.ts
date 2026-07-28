import { WHATS_NEW_ENTRIES } from "../constants";

export function buildWhatsNewMarkdown(): string {
  const sections = WHATS_NEW_ENTRIES.map((entry) => {
    const lines = entry.changes.map((change) => `- ${change}`).join("\n");
    return `## ${entry.version} - ${entry.title} (${entry.date})\n\n${lines}`;
  });

  return `# What's New

Notable changes between releases.

${sections.join("\n\n")}
`;
}

export function getLatestWhatsNewLabel(): string {
  const latest = WHATS_NEW_ENTRIES[0];
  return latest ? `${latest.version} - ${latest.title}` : "No updates yet";
}
