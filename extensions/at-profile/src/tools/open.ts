import { catalogApp, catalogSites } from "../catalog";
import { findVisibleApp, getAppEntries } from "../helpers/apps";
import { openProfile } from "../helpers/open-profile";
import { normalizeUrlTemplate } from "../helpers/url";
import { Input } from "../types";

/**
 * A site Find Profiles reported, by catalog ID or name. When My Apps already has it (perhaps renamed), that app is
 * used; when the user hid it, it stays hidden.
 */
async function findCatalogApp(query: string) {
  const normalized = query.trim().toLowerCase();
  const site = catalogSites().find((entry) => entry.id === normalized || entry.name.toLowerCase() === normalized);
  const app = site ? catalogApp(site) : undefined;
  if (!app) return undefined;
  const entries = await getAppEntries();
  const mine = entries.find(
    (entry) => normalizeUrlTemplate(entry.urlTemplate) === normalizeUrlTemplate(app.urlTemplate),
  );
  if (mine) return mine.visible ? mine : undefined;
  // The site was added and then edited to point elsewhere; its ID would open that other site
  if (entries.some((entry) => entry.value === app.value)) return undefined;
  return app;
}

/**
 * Opens a profile on a specified social app
 * @param input - Contains profile name and app identifier
 * @param input.profile - Profile/username to open (@ prefix will be removed)
 * @param input.app - App identifier/value to open the profile on
 */
const tool = async (input: Input) => {
  const app = (await findVisibleApp(input.app)) ?? (await findCatalogApp(input.app));
  if (!app) {
    throw new Error(`App "${input.app}" is not available. It may be hidden in Manage Apps.`);
  }

  const result = await openProfile(input.profile, app.value);
  return `Opened @${result.profile} on ${result.app.name}.`;
};
export default tool;
