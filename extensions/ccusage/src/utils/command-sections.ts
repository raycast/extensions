export const COMMAND_SECTIONS = [
  { preference: "showToday", view: "today", id: "today" },
  { preference: "showThisWeek", view: "week", id: "week" },
  { preference: "showThisMonth", view: "month", id: "month" },
  { preference: "showSessions", view: "session", id: "sessions" },
  { preference: "showCosts", view: "cost", id: "cost-analysis" },
  { preference: "showModels", view: "model", id: "model-breakdown" },
  { preference: "showUsageLimits", view: "usage-limits", id: "usage-limits" },
] as const;

export type CommandSection = (typeof COMMAND_SECTIONS)[number];
export type SummarySection = "daily" | "weekly" | "monthly";
type SectionPreferences = Partial<Record<CommandSection["preference"], unknown>> & { defaultView?: string };

export function getCommandConfiguration(values: SectionPreferences) {
  const sections = COMMAND_SECTIONS.filter(
    ({ preference }) => values[preference] !== false && values[preference] !== "false",
  );
  const visible = new Set(sections.map(({ view }) => view));
  const summarySections: SummarySection[] = [];
  if (visible.has("today") || visible.has("cost")) summarySections.push("daily");
  if (visible.has("week")) summarySections.push("weekly");
  if (visible.has("month")) summarySections.push("monthly");
  return {
    sections,
    summarySections,
    selectedItemId: sections.find(({ view }) => view === values.defaultView)?.id ?? sections[0]?.id,
  };
}
