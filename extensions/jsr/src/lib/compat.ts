import type { Image } from "@raycast/api";

import type { SearchResultDocument } from "@/types";

export const compatIcons = (item: SearchResultDocument): Array<{ icon: Image.ImageLike; text: string }> => {
  const icons: Array<{ icon: Image.ImageLike; text: string }> = [];
  if (item.runtimeCompat.node) {
    icons.push({ icon: { source: "node.svg" }, text: "Node" });
  }
  if (item.runtimeCompat.deno) {
    icons.push({ icon: { source: "deno.svg" }, text: "Deno" });
  }
  if (item.runtimeCompat.browser) {
    icons.push({ icon: { source: "browsers.svg" }, text: "Browser" });
  }
  if (item.runtimeCompat.workerd) {
    icons.push({ icon: { source: "cloudflare-workers.svg" }, text: "Worker" });
  }
  if (item.runtimeCompat.bun) {
    icons.push({ icon: { source: "bun.svg" }, text: "Bun" });
  }
  return icons;
};
