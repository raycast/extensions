import { Item } from "./types";

export function getMarkdownTable(item: Item): string {
  const latestConf = item.confs?.[0];

  return `
**Next Conference**
| Information | Value |
| ----------- | ----- |
| Date | ${latestConf?.date || "Not announced"} |
| Location | ${latestConf?.place || "Not announced"} |
| Deadline | ${latestConf?.timeline?.[0]?.deadline || "Not announced"} |
| Website | ${latestConf?.link ? `[${latestConf.link}](${latestConf.link})` : "Not announced"} |
  `.trim();
}
