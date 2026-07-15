import { open } from "@raycast/api";

export async function openMultipleLinks(links: string, browser: string): Promise<number> {
  const linksToOpen = links.split("\n").filter((link) => link.trim() !== "");

  for (let i = 0; i < linksToOpen.length; i++) {
    const link = linksToOpen[i].trim();
    if (link) {
      await open(link, browser);
    }
  }

  return linksToOpen.length;
}
