import { Icon, Keyboard, MenuBarExtra, environment, launchCommand, LaunchType, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "node:path";
import { useEffect, useState, type ReactElement } from "react";
import { formatDuration } from "./lib/format.ts";
import { describeStranded, planFor, withNamedCategory } from "./lib/goalBlocks.ts";
import {
  categoryTitleFor,
  findCategory,
  ownCategoryFor,
  readCategories,
  writeImportFile,
} from "./lib/focusCategories.ts";
import { QUICK_STARTS, quickStartGoals, RECENT_MS, startSessionUrl } from "./lib/quickstart.ts";
import {
  announce,
  getPreferences,
  isRaycast2,
  learnGoalBlocks,
  rememberQuickStart,
  SUPPORT_URL,
} from "./lib/runtime.ts";
import { useStats } from "./lib/useStats.ts";

const RAYCAST_FOCUS = {
  ownerOrAuthorName: "raycast",
  extensionName: "raycast-focus",
  type: LaunchType.UserInitiated,
} as const;

const QUICK_KEYS: Keyboard.KeyEquivalent[] = ["1", "2", "3"];

const CATEGORY_KEY: Keyboard.Shortcut = { modifiers: ["cmd"], key: "0" };

const BACKGROUND = environment.launchType === LaunchType.Background;

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

const tryLaunch = (options: Parameters<typeof launchCommand>[0], failure: string) =>
  launchCommand(options).catch((error) => showHUD(`${failure}: ${reason(error)}`));

export default function FocusMenuBar() {
  const { data, isLoading, revalidate } = useStats();
  const prefs = getPreferences();
  const { data: learned } = useCachedPromise(learnGoalBlocks, [], { keepPreviousData: true });
  const { data: categories } = useCachedPromise(readCategories, [], { keepPreviousData: true });

  const stats = data?.stats;
  const [announced, setAnnounced] = useState(false);
  useEffect(() => {
    if (!BACKGROUND || isLoading || announced) return;
    announce()
      .catch(() => undefined)
      .finally(() => setAnnounced(true));
  }, [isLoading, announced]);
  const announcing = BACKGROUND && !announced;

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

  const planOf = (goal: string) => {
    const blocks = learned?.blocks ?? {};
    const setup = learned?.setup ?? null;
    if (isRaycast2) return withNamedCategory(planFor(goal, blocks, setup), goal);
    return planFor(goal, blocks, setup, findCategory(categories ?? [], categoryTitleFor(goal)));
  };

  const goals = quickStartGoals(data?.sessions ?? []).map((goal) => ({ ...goal, plan: planOf(goal.name) }));
  const quickStarts = goals.slice(0, QUICK_STARTS);
  const moreGoals = goals.slice(QUICK_STARTS).filter((goal) => Date.now() - goal.lastAt <= RECENT_MS);

  const startItem = (goal: (typeof goals)[number], shortcut?: Keyboard.Shortcut) => (
    <MenuBarExtra.Item
      key={goal.name}
      title={`${formatDuration(goal.minutes)} ${goal.name}`}
      icon={Icon.Play}
      shortcut={shortcut}
      onAction={async () => {
        if (isRaycast2) await rememberQuickStart(goal.name, goal.plan.categories).catch(() => undefined);
        await open(startSessionUrl(goal.name, goal.minutes, goal.plan.categories, goal.plan.mode));
      }}
    />
  );

  const recent = quickStarts[0];
  const own = recent && ownCategoryFor(recent.name);
  const needsCategory =
    recent && own && recent.plan.skipped.length > 0 && !(isRaycast2 && recent.plan.mode === "allow")
      ? {
          name: recent.name,
          stranded: recent.plan.skipped,
          own,
          exists: (learned?.blocks[recent.name]?.categories ?? []).some((c) => c.id === own.id),
        }
      : undefined;

  const addToOwn = (shortcut?: Keyboard.Shortcut, alternate?: ReactElement<MenuBarExtra.Item.Props>) =>
    needsCategory && (
      <MenuBarExtra.Item
        title={`Add to ${needsCategory.own.title}`}
        icon={Icon.Plus}
        shortcut={shortcut}
        alternate={alternate}
        tooltip={[
          describeStranded(needsCategory.stranded),
          `Opens Raycast's Focus categories. Add these to ${needsCategory.own.title} and quick starts block them too.`,
          ...(alternate ? [`No ${needsCategory.own.title} in Raycast? Hold ⌥ to import one.`] : []),
        ].join("\n")}
        onAction={() =>
          tryLaunch({ ...RAYCAST_FOCUS, name: "search-focus-categories" }, "Could not open Search Focus Categories")
        }
      />
    );

  const importOwn = (shortcut?: Keyboard.Shortcut, alternate?: ReactElement<MenuBarExtra.Item.Props>) =>
    needsCategory && (
      <MenuBarExtra.Item
        title={`Add Category for ${needsCategory.name}`}
        icon={Icon.Plus}
        shortcut={shortcut}
        alternate={alternate}
        tooltip={[
          "Saves a Focus category to Downloads, then opens Raycast's importer. Upload the file to save apps or websites you blocked.",
          ...(alternate ? [`Already made ${needsCategory.own.title}? Hold ⌥ to add these to it instead.`] : []),
        ].join("\n")}
        onAction={async () => {
          let file: string;
          try {
            file = await writeImportFile(needsCategory.name, needsCategory.stranded);
          } catch (error) {
            await showHUD(`Could not write the import file: ${reason(error)}`);
            return;
          }
          await tryLaunch(
            { ...RAYCAST_FOCUS, name: "import-focus-categories" },
            `Saved ${path.basename(file)} to Downloads, but could not open the importer`,
          );
        }}
      />
    );

  const categoryItem = () => {
    if (!needsCategory) return null;
    if (!isRaycast2) return importOwn(CATEGORY_KEY);
    return needsCategory.exists
      ? addToOwn(CATEGORY_KEY, importOwn() || undefined)
      : importOwn(CATEGORY_KEY, addToOwn() || undefined);
  };

  return (
    <MenuBarExtra title={title} isLoading={isLoading || announcing}>
      {stats && (
        <MenuBarExtra.Item
          title={`${formatDuration(stats.todayMinutes)} today · 🔥 ${stats.currentStreak} · ${formatDuration(stats.weekMinutes)} this week`}
        />
      )}
      {data?.collector && !data.collector.running && (
        <MenuBarExtra.Item title="Not recording. Click to resume." icon={Icon.ExclamationMark} onAction={revalidate} />
      )}

      <MenuBarExtra.Section>
        {categoryItem()}
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
          onAction={() =>
            tryLaunch({ ...RAYCAST_FOCUS, name: "start-focus-session" }, "Could not open Start Focus Session")
          }
        />
        <MenuBarExtra.Item
          title="Log Past Session"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() =>
            tryLaunch(
              { name: "focus-sessions", type: LaunchType.UserInitiated, context: { add: true } },
              "Could not open Browse Sessions",
            )
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
