import { Icon, Keyboard, MenuBarExtra, environment, launchCommand, LaunchType, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { formatDuration } from "./lib/format.ts";
import { NOTHING_LEARNED, quickStartPlan, strandedSummary } from "./lib/goalBlocks.ts";
import { readCategories } from "./lib/focusCategories.ts";
import { QUICK_STARTS, quickStartGoals, RECENT_MS, startSessionUrl } from "./lib/quickstart.ts";
import {
  announce,
  getPreferences,
  isRaycast2,
  learnGoalBlocks,
  RAYCAST_FOCUS,
  rememberQuickStart,
  resumeRecording,
  SUPPORT_URL,
} from "./lib/runtime.ts";
import { useStats } from "./lib/useStats.ts";

const QUICK_KEYS: Keyboard.KeyEquivalent[] = ["1", "2", "3"];

const BACKGROUND = environment.launchType === LaunchType.Background;

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

const tryLaunch = (options: Parameters<typeof launchCommand>[0], failure: string) =>
  launchCommand(options).catch((error) => showHUD(`${failure}: ${reason(error)}`));

const resume = () =>
  resumeRecording()
    .then((status) => (status.running ? undefined : showHUD("Could not resume recording")))
    .catch((error) => showHUD(`Could not resume recording: ${reason(error)}`));

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

  const goals = quickStartGoals(data?.sessions ?? []).map((goal) => {
    const { plan, need } = quickStartPlan(goal.name, learned ?? NOTHING_LEARNED, categories ?? [], isRaycast2);
    return { ...goal, plan, need: need?.pending ? undefined : need };
  });
  const quickStarts = goals.slice(0, QUICK_STARTS);
  const moreGoals = goals.slice(QUICK_STARTS).filter((goal) => Date.now() - goal.lastAt <= RECENT_MS);

  const setups = [...quickStarts, ...moreGoals].flatMap(({ name, need }) => (need ? [{ name, need }] : []));

  const startItem = (goal: (typeof goals)[number], shortcut?: Keyboard.Shortcut) => (
    <MenuBarExtra.Item
      key={goal.name}
      title={`${formatDuration(goal.minutes)} ${goal.name}`}
      subtitle={goal.need && `without ${strandedSummary(goal.need.stranded)}`}
      icon={Icon.Play}
      shortcut={shortcut}
      tooltip={
        goal.need &&
        `${strandedSummary(goal.need.stranded, 3)}\nQuick starts leave these out until they're in ${goal.need.own.title}. See Set Up Categories.`
      }
      onAction={async () => {
        if (isRaycast2) await rememberQuickStart(goal.name, goal.plan.categories).catch(() => undefined);
        await open(startSessionUrl(goal.name, goal.minutes, goal.plan.categories, goal.plan.mode));
      }}
    />
  );

  return (
    <MenuBarExtra title={title} isLoading={isLoading || announcing}>
      {stats && (
        <MenuBarExtra.Item
          title={`${formatDuration(stats.todayMinutes)} today · 🔥 ${stats.currentStreak} · ${formatDuration(stats.weekMinutes)} this week`}
        />
      )}
      {data?.collector && !data.collector.running && (
        <MenuBarExtra.Item
          title="Not recording. Click to resume."
          icon={Icon.ExclamationMark}
          onAction={async () => {
            await resume();
            revalidate();
          }}
        />
      )}

      <MenuBarExtra.Section>
        {quickStarts.map((quick, i) =>
          startItem(quick, QUICK_KEYS[i] ? { modifiers: ["cmd"], key: QUICK_KEYS[i] } : undefined),
        )}
        {moreGoals.length > 0 && (
          <MenuBarExtra.Submenu title="More Quick Starts" icon={Icon.Ellipsis}>
            {moreGoals.map((goal) => startItem(goal))}
          </MenuBarExtra.Submenu>
        )}
        {setups.length > 0 && (
          <MenuBarExtra.Submenu title="Set Up Categories" icon={Icon.WrenchScrewdriver}>
            {setups.map(({ name, need }) => (
              <MenuBarExtra.Item
                key={name}
                title={need.own.title}
                subtitle={strandedSummary(need.stranded)}
                icon={need.exists ? Icon.Pencil : Icon.Plus}
                tooltip={strandedSummary(need.stranded, 3)}
                onAction={() =>
                  tryLaunch(
                    { name: "focus-stats", type: LaunchType.UserInitiated, context: { setUp: name } },
                    "Could not open Set Up Categories",
                  )
                }
              />
            ))}
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
