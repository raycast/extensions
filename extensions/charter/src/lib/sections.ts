import { FAMILIES } from "../data/families";
import { groupByFamily, type ChartType } from "./catalog";

export interface ChartSection {
  id: string;
  title: string;
  charts: ChartType[];
}

const FAVORITES_SECTION = "favorites";
const RECENT_SECTION = "recent";

/** Favorites, then recent in the order they were used, then one section per family in catalog order. */
export function buildSections(charts: ChartType[], favorites: string[], recent: string[]): ChartSection[] {
  const sections: ChartSection[] = [];
  const favorite = charts.filter((chart) => favorites.includes(chart.id));
  if (favorite.length > 0) {
    sections.push({ id: FAVORITES_SECTION, title: "Favorites", charts: favorite });
  }
  const recentCharts = recent.flatMap((id) => charts.filter((chart) => chart.id === id));
  if (recentCharts.length > 0) {
    sections.push({ id: RECENT_SECTION, title: "Recent", charts: recentCharts });
  }
  const byFamily = groupByFamily(charts);
  for (const family of FAMILIES) {
    const members = byFamily.get(family.id);
    if (members?.length) sections.push({ id: family.id, title: family.title, charts: members });
  }
  return sections;
}
