import { Color, Icon } from "@raycast/api";
import type { GeoDashboardView } from "../types/geo";

export const GEO_PERIODS = [7, 30, 90, 365] as const;

export const GEO_CHART_COLORS = ["#8b5cf6", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#14b8a6"] as const;

export const GEO_VIEWS: ReadonlyArray<{
  icon: Icon;
  title: string;
  value: GeoDashboardView;
}> = [
  { value: "overview", title: "Overview", icon: Icon.Gauge },
  { value: "visibility", title: "Visibility", icon: Icon.LineChart },
  { value: "share", title: "Share of Voice", icon: Icon.PieChart },
  { value: "languages", title: "Languages", icon: Icon.Globe },
  { value: "prompts", title: "Prompts & Sequences", icon: Icon.Message },
  { value: "gaps", title: "Content Gaps", icon: Icon.LightBulb },
  { value: "briefs", title: "Content Briefs", icon: Icon.Document },
  { value: "readiness", title: "Agent Readiness", icon: Icon.CheckCircle },
  { value: "settings", title: "Settings", icon: Icon.Gear },
  { value: "traffic", title: "AI Traffic", icon: Icon.BarChart },
];

export const GEO_VISITOR_COLORS: Record<"ai_referral" | "crawler", string> = {
  crawler: "#8b5cf6",
  ai_referral: "#22c55e",
};

export const GEO_STATUS_COLORS = {
  configured: Color.Green,
  disabled: Color.SecondaryText,
  scanning: Color.Orange,
} as const;
