import { Color, Icon } from "@raycast/api";
import { FolderContentItem } from "../api/endpoints";

// Dovetail's public API doesn't expose a per-item icon/color/logo for any resource type, so
// these are just distinct built-in Raycast icons/colors to tell types apart at a glance.
export const TYPE_ICON: Record<FolderContentItem["type"], Icon> = {
  folder: Icon.Folder,
  project: Icon.BulletPoints,
  doc: Icon.Stars,
  channel: Icon.BarChart,
  dashboard: Icon.PieChart,
  agent: Icon.Bolt,
};

export const TYPE_COLOR: Record<FolderContentItem["type"], Color> = {
  folder: Color.SecondaryText,
  project: Color.Blue,
  doc: Color.Purple,
  channel: Color.Orange,
  dashboard: Color.Green,
  agent: Color.Magenta,
};

export const TYPE_PATH: Record<FolderContentItem["type"], string> = {
  folder: "folders",
  project: "projects",
  doc: "docs",
  channel: "channels",
  dashboard: "dashboards",
  agent: "agents",
};

export const TYPE_LABEL: Record<FolderContentItem["type"], string> = {
  folder: "Folder",
  project: "Project",
  doc: "Doc",
  channel: "Channel",
  dashboard: "Dashboard",
  agent: "Agent",
};

// Order to show type-count pills in on a folder row.
export const TYPE_ORDER: FolderContentItem["type"][] = ["project", "channel", "doc", "dashboard", "agent", "folder"];
