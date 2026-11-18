import { Icon } from "@raycast/api";
import type { Family } from "../lib/catalog";

export interface FamilyInfo {
  id: Family;
  title: string;
  /** Used for grid tiles until a thumbnail exists, and for list icons. */
  icon: Icon;
}

/** Section order in both views. */
export const FAMILIES: FamilyInfo[] = [
  { id: "flow", title: "Flow and Process", icon: Icon.ArrowRight },
  { id: "structure", title: "Structure", icon: Icon.AppWindowGrid3x3 },
  { id: "hierarchy", title: "Hierarchy and Part to Whole", icon: Icon.PieChart },
  { id: "quantity", title: "Quantity", icon: Icon.BarChart },
  { id: "time", title: "Time and Planning", icon: Icon.Calendar },
  { id: "geo", title: "Maps", icon: Icon.Globe },
  { id: "framework", title: "Frameworks", icon: Icon.Layers },
];

export function familyInfo(id: Family): FamilyInfo {
  const info = FAMILIES.find((family) => family.id === id);
  if (!info) throw new Error(`Unknown chart family: ${id}`);
  return info;
}
