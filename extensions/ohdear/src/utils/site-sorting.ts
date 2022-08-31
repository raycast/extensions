export function sortSites(sites: any) {
  const groupedSites = sites
    .sort((a: any, b: any) => {
      const textA = a.label.toUpperCase();
      const textB = b.label.toUpperCase();

      return textA < textB ? -1 : textA > textB ? 1 : 0;
    })
    .reduce((site: any, curr: any) => {
      const group = curr.group_name ? curr.group_name : "Ungrouped";

      if (!site[group]) {
        site[group] = [];
      }

      site[group].push(curr);

      return site;
    }, {});

  const groupedSiteEntries = groupedSites
    ? Object.entries(groupedSites).sort((a: any, b: any) => {
        const textA = a[0].toUpperCase();
        const textB = b[0].toUpperCase();

        return textA < textB ? -1 : textA > textB ? 1 : 0;
      })
    : [];

  return Object.fromEntries(groupedSiteEntries);
}
