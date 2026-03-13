/* eslint-disable @typescript-eslint/no-explicit-any */
import { WikiNode } from "./api";

export function toTitleCase(str: string) {
  const result = str.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function toSentenceCase(str: string) {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceLinks(text: string, language: string, links: string[] = [], openInBrowser = true) {
  const regex = new RegExp(`\\b(${links.map(escapeRegExp).join("|")})\\b`, "g");
  return text.replaceAll(regex, (link) => {
    const url = openInBrowser
      ? `https://${language}.wikipedia.org/wiki/${encodeURI(link)}`
      : `raycast://extensions/vimtor/wikipedia/open-page?arguments=${encodeURI(JSON.stringify({ title: link }))}`;
    return `[${link}](${url})`;
  });
}

export function renderContent(
  nodes: WikiNode[],
  level: number,
  links: string[] = [],
  language = "en",
  openLinksInBrowser = true,
): string {
  if (!nodes) return "";
  return nodes
    .filter((node) => node.content || node.content.length > 0)
    .filter((node) => !excludedSections.includes(node.title))
    .map((node) => {
      const title = `${"#".repeat(level)} ${node.title}`;
      const content = replaceLinks(node.content, language, links, openLinksInBrowser);
      const items = node.items ? renderContent(node.items, level + 1, links, language) : "";
      return `${title}\n\n${content}\n\n${items}`;
    })
    .join("\n\n");
}

export function processMetadata(metadata?: any) {
  return Object.entries(metadata ?? {})
    .filter(([label]) => !excludedMetatadataLabels.includes(label.toString()))
    .filter(([label]) => isNaN(parseInt(label)))
    .filter(([, value]) => !excludedMetatadataValues.includes((value as any).toString()))
    .map(([label, value]) => ({
      key: label,
      title: toTitleCase(label),
      value,
    }));
}

export const excludedSections = [
  "See also",
  "References",
  "External links",
  "Further reading",
  "Notes",
  "Bibliography",
  "Sources",
  "Citations",
  "Footnotes",
  "Véase también",
  "Referencias",
  "Enlaces externos",
  "Otras lecturas",
  "Notas",
  "Bibliografía",
  "Fuentes",
  "Citas",
  "Notas al pie",
  "Siehe auch",
  "Verweise",
  "Externe Links",
  "Weiteres Lesen",
  "Anmerkungen",
  "Literaturverzeichnis",
  "Quellen",
  "Zitate",
  "Fußnoten",
  "Voir également",
  "Les références",
  "Liens externes",
  "Lecture complémentaire",
  "Remarques",
  "Bibliographie",
  "Sources",
  "Citations",
  "Notes de bas de page",
  "Смотрите также",
  "Использованная литература",
  "Внешние ссылки",
  "Дальнейшее чтение",
  "Примечания",
  "Библиография",
  "Цитаты",
  "Сноски",
  "Veja também",
  "Referências",
  "Links externos",
  "Leitura adicional",
  "Notas",
  "Bibliografia",
  "Fontes",
  "Citações",
  "Notas de rodapé",
  "Guarda anche",
  "Riferimenti",
  "Link esterno",
  "Ulteriori letture",
  "Appunti",
  "Bibliografia",
  "Fonti",
  "Citazioni",
  "Note a piè di pagina",
  "Ayrıca bakınız",
  "Referanslar",
  "Dış bağlantılar",
  "Daha fazla okuma",
  "Notlar",
  "Kaynakça",
  "Kaynaklar",
  "Alıntılar",
  "Dipnotlar",
  "Δείτε επίσης",
  "Βιβλιογραφικές αναφορές",
  "Εξωτερικοί σύνδεσμοι",
  "Περαιτέρω ανάγνωση",
  "Σημειώσεις",
  "Βιβλιογραφία",
  "Πηγές",
  "Αναφορές",
  "Υποσημειώσεις",
];

export const excludedMetatadataLabels = [
  "image",
  "cat",
  "subcat",
  "sortkey",
  "italictitle",
  "wikisource",
  "listadesplegable",
];

export const excludedMetatadataValues = ["true", "false", "si", "no", "altura"];

export function formatMetadataValue(label: string, value?: Date | null | string) {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (!value) {
    return "N/A";
  }

  if (label === "coordinates") {
    return value.toString().split("|").slice(0, 2).join(", ");
  }

  return value.toString();
}
