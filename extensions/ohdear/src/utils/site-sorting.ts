import type { Site } from "../interface";

export function sortSites(sites: Site[]) {
  const groupedSites = sites
    .sort((a, b) => {
      const textA = a.label.toUpperCase();
      const textB = b.label.toUpperCase();

      return textA < textB ? -1 : textA > textB ? 1 : 0;
    })
    .reduce<Record<string, Site[]>>((site, curr) => {
      const group = curr.group_name ? curr.group_name : "Ungrouped";

      if (!site[group]) {
        site[group] = [];
      }

      site[group].push(curr);

      return site;
    }, {});

  const groupedSiteEntries = groupedSites
    ? Object.entries(groupedSites).sort((a, b) => {
        const textA = a[0].toUpperCase();
        const textB = b[0].toUpperCase();

        return textA < textB ? -1 : textA > textB ? 1 : 0;
      })
    : [];

  return Object.fromEntries(groupedSiteEntries);
}
