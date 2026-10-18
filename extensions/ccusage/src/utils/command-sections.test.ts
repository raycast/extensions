import { COMMAND_SECTIONS, getCommandConfiguration } from "./command-sections";

const hidden = Object.fromEntries(COMMAND_SECTIONS.map(({ preference }) => [preference, false]));

it("places This Month after This Week and retains existing defaults", () => {
  const config = getCommandConfiguration({});
  expect(config.sections.map(({ view }) => view)).toEqual([
    "today",
    "week",
    "month",
    "session",
    "cost",
    "model",
    "usage-limits",
  ]);
  expect(config.summarySections).toEqual(["daily", "weekly", "monthly"]);
});

it("requests nothing when all sections are hidden", () => {
  const config = getCommandConfiguration(hidden);
  expect(config.sections).toEqual([]);
  expect(config.summarySections).toEqual([]);
  expect(config.selectedItemId).toBeUndefined();
});

it.each([
  ["showToday", ["daily"]],
  ["showThisWeek", ["weekly"]],
  ["showThisMonth", ["monthly"]],
  ["showCosts", ["daily"]],
  ["showModels", []],
  ["showSessions", []],
  ["showUsageLimits", []],
])("requests only the summary data needed for %s", (preference, expected) => {
  expect(getCommandConfiguration({ ...hidden, [preference]: true }).summarySections).toEqual(expected);
});

it("falls back to the first visible section when the preferred section is hidden", () => {
  expect(getCommandConfiguration({ ...hidden, showThisMonth: true, defaultView: "session" }).selectedItemId).toBe(
    "month",
  );
});

it.each([
  ["session", "sessions"],
  ["cost", "cost-analysis"],
  ["model", "model-breakdown"],
])("maps the %s preference to its actual list item", (defaultView, expected) => {
  expect(getCommandConfiguration({ defaultView }).selectedItemId).toBe(expected);
});
