import {
  MenuBarExtra,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  openCommandPreferences,
  updateCommandMetadata,
} from "@raycast/api";
import { useCachedPromise, getProgressIcon } from "@raycast/utils";
import { getItems, startItem, updateItem } from "./storage";
import { TIME_FORMAT_OPTIONS, FASTING_DURATION_MS, FASTING_COLOR } from "./constants";
//import { getLastStoppedFast } from "./utils";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(getItems);
  const runningFast = data?.find((item) => item.end == null);
  const preferences = getPreferenceValues<Preferences.Menubar>();
  //const { lastStoppedItem, hoursSinceStopped } = getLastStoppedFast(data);

  const formatMenubarTitle = (fast: typeof runningFast) => {
    if (!fast) return "Not Fasting";

    const percentage = Math.round(fast.progress * 100);
    const timeLeft = `${fast.remainingHours}h ${fast.remainingMinutes}m`;
    const time = new Date().toLocaleTimeString(undefined, TIME_FORMAT_OPTIONS);

    return preferences.menubarTitle
      .replace("{percentage}", `${percentage.toString()}%`)
      .replace("{timeLeft}", timeLeft)
      .replace("{time}", time);
  };

  updateCommandMetadata({ subtitle: formatMenubarTitle(runningFast) });

  const stopTimer = async () => {
    if (runningFast && runningFast.id) {
      await updateItem(runningFast.id, { end: new Date() });
      await revalidate();
      await showToast({ title: "Timer stopped", style: Toast.Style.Success });
    }
  };

  if (!runningFast) {
    if (preferences.idleDisplay === "none") {
      return null;
    }

    return (
      <MenuBarExtra
        icon={getProgressIcon(0, Color.Green)}
        title={preferences.idleDisplay === "full" ? "Not Fasting" : ""}
      >
        <MenuBarExtra.Item
          title="Start New Fast"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={async () => {
            await startItem();
            await revalidate();
          }}
        />
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={getProgressIcon(runningFast.progress, FASTING_COLOR)}
      title={formatMenubarTitle(runningFast)}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title={`Started: ${new Date(runningFast.start).toLocaleTimeString(undefined, TIME_FORMAT_OPTIONS)}`}
      />
      <MenuBarExtra.Item title={`Remaining: ${runningFast.remainingHours}h ${runningFast.remainingMinutes}m`} />
      <MenuBarExtra.Item
        title={`Ends: ${new Date(runningFast.start.getTime() + FASTING_DURATION_MS).toLocaleTimeString(
          undefined,
          TIME_FORMAT_OPTIONS,
        )}`}
      />
      {runningFast.end && (
        <MenuBarExtra.Item
          title={`Ended: ${new Date(runningFast.end).toLocaleTimeString(undefined, TIME_FORMAT_OPTIONS)}`}
        />
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Stop}
          title="Stop Timer"
          onAction={stopTimer}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Item
        icon={Icon.Gear}
        title="Open Preferences"
        onAction={openCommandPreferences}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  );
}
