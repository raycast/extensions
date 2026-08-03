import {
  Color,
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  open,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { sparkline } from "./lib/chart";
import { formatDuration } from "./lib/forecast";
import { load, severityOf, settings } from "./lib/load";

/** Menu bar items swallow rejected promises, so a failed launch is invisible. */
async function openCommand(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (e) {
    await showFailureToast(e, { title: `Cannot open ${name}` });
  }
}

const ICON: Record<string, { source: Icon; tintColor: Color }> = {
  ok: { source: Icon.CircleProgress75, tintColor: Color.Green },
  warn: { source: Icon.Warning, tintColor: Color.Orange },
  danger: { source: Icon.ExclamationMark, tintColor: Color.Red },
};

export default function Command() {
  const s = settings();
  const { data, isLoading, revalidate } = useCachedPromise(load, [], {
    keepPreviousData: true,
  });

  if (!data) {
    return (
      <MenuBarExtra
        isLoading={isLoading}
        icon={Icon.CircleProgress}
        tooltip="Claude usage"
      />
    );
  }

  const { forecast: f, limits, error } = data;
  const sev = severityOf(f.pctNow, s);
  const pct = Math.round(f.pctNow);
  const projected = Math.round(f.pctAtReset);

  let title: string | undefined;
  switch (s.menuBarShow) {
    case "icon":
      title = undefined;
      break;
    case "both":
      title = `${pct}% → ${projected}%`;
      break;
    case "spark":
      title = `${pct}% ${sparkline(f.actual, 12)}`;
      break;
    default:
      title = `${pct}%`;
  }

  const resetIn = f.windowEnd - Date.now();
  const hit = f.hitsLimitAt;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={ICON[sev]}
      title={title}
      tooltip={`Claude weekly usage ${pct}% — projected ${projected}% at reset`}
    >
      <MenuBarExtra.Section title="Now">
        <MenuBarExtra.Item
          title={`Weekly limit: ${f.pctNow.toFixed(1)}%`}
          icon={ICON[sev]}
        />
        {limits.fiveHour ? (
          <MenuBarExtra.Item
            title={`5-hour limit: ${limits.fiveHour.utilization.toFixed(0)}%`}
            icon={Icon.Clock}
          />
        ) : null}
        <MenuBarExtra.Item
          title={`Resets in ${formatDuration(resetIn)}`}
          icon={Icon.ArrowClockwise}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Forecast">
        <MenuBarExtra.Item
          title={
            hit === null
              ? `Safe — projected ${projected}% at reset`
              : `Hits 100% in ${formatDuration(hit - Date.now())} (${new Date(
                  hit,
                ).toLocaleString(undefined, {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })})`
          }
          icon={
            hit === null
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.Bolt, tintColor: Color.Red }
          }
        />
        {f.k === null ? (
          <MenuBarExtra.Item
            title="Not calibrated yet — no local activity this week"
            icon={Icon.QuestionMark}
          />
        ) : null}
        {error ? (
          <MenuBarExtra.Item
            title={`Fetch error: ${error}`}
            icon={Icon.XMarkCircle}
          />
        ) : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Usage Graph"
          icon={Icon.BarChart}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => openCommand("weekly-usage")}
        />
        <MenuBarExtra.Item
          title="How This Forecast Works"
          icon={Icon.Book}
          onAction={() => openCommand("methodology")}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          title="Claude Usage Settings"
          icon={Icon.Globe}
          onAction={() => open("https://claude.ai/settings/usage")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
