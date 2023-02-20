import { getPreferenceValues } from "@raycast/api";
import { excludedSections } from "./constants";

const preferences = getPreferenceValues();

const openInBrowser = preferences.openIn === "browser";

export function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function toSentenceCase(str: string) {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface Node {
  title: string;
  content: string;
  items?: Node[];
}

export function replaceLinks(text: string, language: string, links: string[] = []) {
  const regex = new RegExp(`\\b(${links.map(escapeRegExp).join("|")})\\b`, "g");
  return text.replaceAll(regex, (link) => {
    const url = openInBrowser
      ? `https://${language}.wikipedia.org/wiki/${encodeURI(link)}`
      : `raycast://extensions/vimtor/wikipedia/open-page?arguments=${encodeURI(JSON.stringify({ title: link }))}`;
    return `[${link}](${url})`;
  });
}

export function renderContent(nodes: Node[], level: number, links: string[] = [], language = "en"): string {
  return nodes
    .filter((node) => node.content || node.content.length > 0)
    .filter((node) => !excludedSections.includes(node.title))
    .map((node) => {
      const title = `${"#".repeat(level)} ${node.title}`;
      const content = replaceLinks(node.content, language, links);
      const items = node.items ? renderContent(node.items, level + 1, links, language) : "";
      return `${title}\n\n${content}\n\n${items}`;
    })
    .join("\n\n");
}
