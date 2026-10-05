import { Color, Image } from "@raycast/api";

/**
 * Entity type icons only - interface affordances stay on Raycast's built-in set.
 *
 * Lucide files are `stroke="currentColor"` with no fill, which Raycast renders black and therefore
 * invisible on the dark theme, so the tint is mandatory. Names must appear in scripts/sync-icons.mjs.
 */
function lucide(name: string, tintColor: Color.ColorLike): Image.ImageLike {
  return { source: `icons/${name}.svg`, tintColor };
}

/** Hex rather than Raycast's palette, which has no cyan. Only the first four are confirmed. */
const TP = {
  userStory: "#4C9DD8",
  bug: "#E5564C",
  feature: "#5CB85C",
  epic: "#3FBFBF",
  // Unverified, chosen to sit alongside the confirmed four.
  task: "#8CC63E",
  portfolioEpic: "#2E9E9E",
  request: "#F0A030",
  impediment: "#D9534F",
  release: "#8E7CC3",
  iteration: "#6C8EBF",
  milestone: "#B07CC6",
  build: "#7A8B99",
  project: "#7A8B99",
  program: "#5A6B7A",
  team: "#4FA3A3",
  company: "#8A97A3",
  person: "#8A97A3",
  test: "#9B7FC7",
} as const;

/** Best effort: the catalogue comes from the instance and may contain custom types. */
export const TYPE_ICONS: Record<string, Image.ImageLike> = {
  UserStory: lucide("file-text", TP.userStory),
  Bug: lucide("bug", TP.bug),
  Task: lucide("square-check-big", TP.task),
  Feature: lucide("sparkles", TP.feature),
  Epic: lucide("crown", TP.epic),
  PortfolioEpic: lucide("layers", TP.portfolioEpic),
  Request: lucide("inbox", TP.request),
  Impediment: lucide("octagon-alert", TP.impediment),

  Release: lucide("rocket", TP.release),
  Iteration: lucide("repeat", TP.iteration),
  TeamIteration: lucide("repeat-2", TP.iteration),
  Milestone: lucide("milestone", TP.milestone),
  Build: lucide("hammer", TP.build),

  Project: lucide("folder-kanban", TP.project),
  Program: lucide("boxes", TP.program),
  Team: lucide("users", TP.team),
  Company: lucide("building-2", TP.company),
  User: lucide("contact", TP.person),
  Requester: lucide("contact", TP.person),

  TestCase: lucide("flask-conical", TP.test),
  TestPlan: lucide("clipboard-list", TP.test),
  TestCaseRun: lucide("list-checks", TP.test),
  TestPlanRun: lucide("list-checks", TP.test),
  Time: lucide("clock", TP.person),
};

export const UNKNOWN_TYPE_ICON = lucide("circle-dashed", Color.SecondaryText);
