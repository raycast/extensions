import { RSSItem } from "./rss";

export function cleanHtml(html: string | undefined) {
  return (html ?? "").replace(/<\/?[^>]+(>|$)/g, "");
}

export function getMarkDownContent(item: RSSItem) {
  let markDownContent = "";
  markDownContent += `# ${cleanHtml(item.title)}\n\n`;
  markDownContent += `### ${item.ago} geleden\n\n`;
  markDownContent += `${item.contentSnippet ?? `![](${item.enclosure?.url})` ?? "> No text"} \n`;
  return markDownContent;
}
