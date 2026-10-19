import { showHUD } from "@raycast/api";
import { addCoolSite } from "./utils/addCoolSite";
import { coolSiteInsertSchema } from "./utils/coolSiteTypesAndSchemas";
import { enrichCoolSite } from "./utils/enrichCoolSite";
import { getCurrentBrowserPage } from "./utils/getCurrentBrowserPage";
import { normalizeCoolSiteTitle, normalizeCoolSiteUrl } from "./utils/normalizeCoolSite";
import { fetchCoolSites } from "./utils/useCoolSites";

export default async function Command() {
  try {
    await showHUD("Reading current site…");
    const [page, coolSites] = await Promise.all([getCurrentBrowserPage(), fetchCoolSites()]);
    const url = normalizeCoolSiteUrl(page.url);
    const duplicate = coolSites.find((site) => normalizeCoolSiteUrl(site.url) === url);

    if (duplicate) {
      console.info(`[quick-add] Duplicate detected: ${duplicate.id}`);
      await showHUD(`Already saved: ${normalizeCoolSiteTitle(duplicate.title)}`);
      return;
    }

    const knownTags = Array.from(new Set(coolSites.flatMap((site) => site.tags))).sort();
    const enriched = await enrichCoolSite({ title: page.title, content: page.content, knownTags });
    const values = coolSiteInsertSchema.parse({ name: enriched.title, url, tags: enriched.tags });

    await addCoolSite(values);
    console.info(`[quick-add] Dispatch accepted for: ${values.name}`);
    await showHUD(`Queued “${values.name}”`);
  } catch (error) {
    console.error("[quick-add] Failed", error);
    await showHUD(error instanceof Error ? error.message : "Could not queue this site");
  }
}
