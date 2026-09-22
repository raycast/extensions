import { Icon, Keyboard, MenuBarExtra, launchCommand, LaunchType, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatDuration } from "./lib/format.ts";
import { describeStranded, planFor } from "./lib/goalBlocks.ts";
import { categoryTitleFor, findCategory, readCategories, writeImportFile } from "./lib/focusCategories.ts";
import { QUICK_STARTS, quickStartGoals, RECENT_MS, startSessionUrl } from "./lib/quickstart.ts";
import { getPreferences, learnGoalBlocks, SUPPORT_URL } from "./lib/runtime.ts";
import { useStats } from "./lib/useStats.ts";

// Raycast Focus is a built-in extension; launchCommand reaches it under Raycast's own author name.
const RAYCAST_FOCUS = {
  ownerOrAuthorName: "raycast",
  extensionName: "raycast-focus",
  type: LaunchType.UserInitiated,
} as const;

const QUICK_KEYS: Keyboard.KeyEquivalent[] = ["1", "2", "3"];

export default function FocusMenuBar() {
  const { data, isLoading, revalidate } = useStats();
  const prefs = getPreferences();
  const { data: learned } = useCachedPromise(learnGoalBlocks, [], { keepPreviousData: true });
  const { data: categories } = useCachedPromise(readCategories, [], { keepPreviousData: true });

  const ownedFor = (goal: string) => findCategory(categories ?? [], categoryTitleFor(goal));
  const stats = data?.stats;

  const title = (() => {
    if (!stats) return "…";
    switch (prefs.menuBarFormat) {
      case "week":
        return formatDuration(stats.weekMinutes);
      case "streak":
        return `🔥 ${stats.currentStreak}d`;
      default:
        return formatDuration(stats.todayMinutes);
    }
  })();

  const goals = quickStartGoals(data?.sessions ?? []).map((goal) => ({
    ...goal,
    plan: planFor(goal.name, learned?.blocks ?? {}, learned?.setup ?? null, ownedFor(goal.name)),
  }));
  const quickStarts = goals.slice(0, QUICK_STARTS);
  const moreGoals = goals.slice(QUICK_STARTS).filter((goal) => Date.now() - goal.lastAt <= RECENT_MS);

  const startItem = (goal: (typeof goals)[number], shortcut?: Keyboard.Shortcut) => (
    <MenuBarExtra.Item
      key={goal.name}
      title={`${formatDuration(goal.minutes)} ${goal.name}`}
      icon={Icon.Play}
      shortcut={shortcut}
      onAction={() => open(startSessionUrl(goal.name, goal.minutes, goal.plan.categories, goal.plan.mode))}
    />
  );

  const recent = quickStarts[0];
  const needsCategory =
    recent && recent.plan.skipped.length > 0 ? { name: recent.name, stranded: recent.plan.skipped } : undefined;

  return (
    <MenuBarExtra title={title} isLoading={isLoading}>
      {stats && (
        <MenuBarExtra.Item
          title={`${formatDuration(stats.todayMinutes)} today · 🔥 ${stats.currentStreak} · ${formatDuration(stats.weekMinutes)} this week`}
        />
      )}
      {data?.collector && !data.collector.running && (
        <MenuBarExtra.Item title="Not recording. Click to resume." icon={Icon.ExclamationMark} onAction={revalidate} />
      )}

      <MenuBarExtra.Section>
        {needsCategory && (
          <MenuBarExtra.Item
            title={`Add Category for ${needsCategory.name}`}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "0" }}
            tooltip={[
              describeStranded(needsCategory.stranded),
              "Saves a Focus category to Downloads, then opens Raycast's importer. Upload the file to save apps or websites you blocked.",
            ].join("\n")}
            onAction={async () => {
              try {
                await writeImportFile(needsCategory.name, needsCategory.stranded);
                await launchCommand({ ...RAYCAST_FOCUS, name: "import-focus-categories" });
              } catch (error) {
                await showHUD(`Could not write the import file: ${error instanceof Error ? error.message : error}`);
              }
            }}
          />
        )}
        {quickStarts.map((quick, i) =>
          startItem(quick, QUICK_KEYS[i] ? { modifiers: ["cmd"], key: QUICK_KEYS[i] } : undefined),
        )}
        {moreGoals.length > 0 && (
          <MenuBarExtra.Submenu title="More Quick Starts" icon={Icon.Ellipsis}>
            {moreGoals.map((goal) => startItem(goal))}
          </MenuBarExtra.Submenu>
        )}
        <MenuBarExtra.Item
          title="Start a Focus Session"
          icon={Icon.Stopwatch}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => launchCommand({ ...RAYCAST_FOCUS, name: "start-focus-session" })}
        />
        <MenuBarExtra.Item
          title="Log Past Session"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() =>
            launchCommand({ name: "focus-sessions", type: LaunchType.UserInitiated, context: { add: true } })
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Buy Me a Coffee"
          icon={Icon.MugSteam}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={() => open(SUPPORT_URL)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
