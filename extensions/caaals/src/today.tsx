import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
  updateCommandMetadata,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { getDiaryByDate } from "./api";
import { formatDate } from "./utils";

export default function Today() {
  // quiet: background refreshes can't show toasts.
  const { data, isLoading, error, revalidate } = useCachedPromise(() =>
    getDiaryByDate(formatDate(new Date()), { quiet: true }),
  );

  const goal = data?.goals.calories ?? null;
  const consumed = data?.totals.calories ?? null;
  const remaining = goal != null && consumed != null ? goal - consumed : null;

  const { menuBarStyle } = getPreferenceValues<Preferences.Today>();
  const title =
    consumed == null || menuBarStyle === "icon"
      ? undefined
      : remaining == null
        ? menuBarStyle === "number"
          ? consumed.toLocaleString()
          : `${consumed.toLocaleString()} kcal`
        : menuBarStyle === "number"
          ? remaining.toLocaleString()
          : remaining >= 0
            ? `${remaining.toLocaleString()} left`
            : `${Math.abs(remaining).toLocaleString()} over`;

  // Running a menu-bar command from root search gives no visible feedback, so
  // surface the live numbers as the command's root-search subtitle instead.
  useEffect(() => {
    if (consumed == null) return;
    const subtitle =
      remaining == null
        ? `${consumed.toLocaleString()} kcal logged today`
        : remaining >= 0
          ? `${remaining.toLocaleString()} kcal left today`
          : `${Math.abs(remaining).toLocaleString()} kcal over today`;
    updateCommandMetadata({ subtitle });
  }, [consumed, remaining]);

  return (
    <MenuBarExtra icon="icon.png" title={title} isLoading={isLoading} tooltip="Caaals — today's calories">
      {error && !data ? (
        <>
          <MenuBarExtra.Item title="Could Not Load Today's Diary" />
          <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </>
      ) : (
        data && (
          <MenuBarExtra.Section title="Today">
            <MenuBarExtra.Item
              title={`Calories: ${macroText(data.totals.calories, data.goals.calories, "kcal")}`}
              icon={Icon.Bolt}
            />
            <MenuBarExtra.Item
              title={`Protein: ${macroText(data.totals.protein, data.goals.protein, "g")}`}
              icon={Icon.Circle}
            />
            <MenuBarExtra.Item
              title={`Carbs: ${macroText(data.totals.carbs, data.goals.carbs, "g")}`}
              icon={Icon.Circle}
            />
            <MenuBarExtra.Item title={`Fat: ${macroText(data.totals.fat, data.goals.fat, "g")}`} icon={Icon.Circle} />
            {data.score?.value != null && (
              <MenuBarExtra.Item title={`Nutrition Score: ${data.score.value}`} icon={Icon.Gauge} />
            )}
          </MenuBarExtra.Section>
        )
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Log Food" icon={Icon.Plus} onAction={() => launch("log-food")} />
        <MenuBarExtra.Item title="Quick Log" icon={Icon.Star} onAction={() => launch("quick-log")} />
        <MenuBarExtra.Item title="Browse Diary" icon={Icon.List} onAction={() => launch("browse-diary")} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function macroText(consumed: number, goal: number | null | undefined, unit: string): string {
  const value = Math.round(consumed).toLocaleString();
  return goal ? `${value} / ${Math.round(goal).toLocaleString()} ${unit}` : `${value} ${unit}`;
}

async function launch(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch {
    // Command may be disabled by the user — nothing sensible to do from the menu bar.
  }
}
