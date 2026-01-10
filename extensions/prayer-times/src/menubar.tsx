import { Icon, MenuBarExtra, launchCommand, LaunchType, Cache } from "@raycast/api";
import {
  usePrayerTimes,
  useCurrentTime,
  isCurrentPrayerTime,
  formatTime,
  formatTimeRemaining,
  type PrayerTime,
} from "./utils";

const cache = new Cache();

export default function Command() {
  const { prayerTimes, nextPrayer, isLoading, error } = usePrayerTimes();
  const cachedDisplayMode = cache.get("displayMode") || "countdown";
  const cachedShowTextOnly = cache.get("showTextOnly") || "both";

  // Skip live updates in icon-only mode (no text to update) or when showing static time
  const skipUpdates = cachedShowTextOnly === "icon" || cachedDisplayMode === "next";
  const currentTime = useCurrentTime(nextPrayer?.time, skipUpdates);

  const getMenuBarTitle = () => {
    if (cachedShowTextOnly === "icon") return "";
    if (isLoading) return "Loading...";
    if (error) return error.length > 30 ? error.substring(0, 30) + "..." : error;
    if (!nextPrayer) return "No prayer times";

    if (cachedDisplayMode === "countdown") {
      const countdown = formatTimeRemaining(nextPrayer.time);
      return `${nextPrayer.name}: ${countdown}`;
    } else {
      return `${nextPrayer.name}: ${formatTime(nextPrayer.time)}`;
    }
  };

  const menuBarTitle = getMenuBarTitle();

  const getMenuBarIcon = () => {
    if (cachedShowTextOnly === "text") return undefined;
    if (isLoading) return Icon.Clock;
    if (error) return Icon.ExclamationMark;
    return { source: "mosque-icon.svg" };
  };

  const menuBarIcon = getMenuBarIcon();

  return (
    <MenuBarExtra
      icon={menuBarIcon}
      title={menuBarTitle}
      isLoading={isLoading}
      tooltip={nextPrayer ? `${nextPrayer.name} - ${formatTime(nextPrayer.time)}` : "Prayer Times"}
    >
      {error && (
        <>
          <MenuBarExtra.Item title={error} />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Settings"
            onAction={() => {
              launchCommand({
                name: "settings",
                ownerOrAuthorName: "Hadi04",
                extensionName: "prayer-times",
                type: LaunchType.UserInitiated,
              }).catch((err) => {
                console.error("Failed to launch settings:", err);
              });
            }}
          />
        </>
      )}

      {!error && !isLoading && (
        <>
          {prayerTimes.map((prayer: PrayerTime) => {
            const isNext = prayer.name === nextPrayer?.name;
            const timeRemaining = formatTimeRemaining(prayer.time);
            const timeFormatted = formatTime(prayer.time);
            const isCurrent = isCurrentPrayerTime(prayer);
            const isPast = prayer.time < currentTime && !isCurrent;

            let subtitle = timeFormatted;
            if (isCurrent) {
              subtitle = `${timeFormatted} (Now)`;
            } else if (!isPast) {
              subtitle = `${timeFormatted} (${timeRemaining})`;
            }

            return (
              <MenuBarExtra.Item
                key={prayer.name}
                title={isCurrent ? `▶ ${prayer.name}` : prayer.name}
                subtitle={subtitle}
                tooltip={isNext ? "Next Prayer" : isCurrent ? "Current Prayer" : undefined}
              />
            );
          })}

          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Settings"
            onAction={() => {
              launchCommand({
                name: "settings",
                ownerOrAuthorName: "Hadi04",
                extensionName: "prayer-times",
                type: LaunchType.UserInitiated,
              }).catch((err) => {
                console.error("Failed to launch settings:", err);
              });
            }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
