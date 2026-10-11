import { WHATS_NEW_ENTRIES } from "../constants";
import { formatDate } from "./format";
import type { Language } from "./language";
import { translate } from "./translations";

export function buildWhatsNewMarkdown(language: Language = "en"): string {
  const sections = WHATS_NEW_ENTRIES.map((entry) => {
    const lines = entry.changes.map((change) => `- ${translate(change, language)}`).join("\n");
    return `## ${entry.version} - ${translate(entry.title, language)} (${formatDate(entry.date, language)})\n\n${lines}`;
  });

  return `# ${translate("whatsNew", language)}

${translate("releaseIntro", language)}

${sections.join("\n\n")}
`;
}

export function getLatestWhatsNewLabel(language: Language = "en"): string {
  const latest = WHATS_NEW_ENTRIES[0];
  return latest ? `${latest.version} - ${translate(latest.title, language)}` : translate("noUpdates", language);
}
