import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, getPreferenceValues, launchCommand, LaunchType, Cache } from "@raycast/api";

const cache = new Cache();
import {
  fetchPrayerTimesByAddress,
  parsePrayerTime,
  getNextPrayer,
  isCurrentPrayerTime,
  formatTime,
  formatTimeRemaining,
  PRAYER_NAMES,
  type PrayerTime,
} from "./utils";

export default function Command() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setUpdateTrigger] = useState(0);

  useEffect(() => {
    async function loadPrayerTimes() {
      setIsLoading(true);
      setError(null);

      try {
        const cachedCity = cache.get("city");
        const cachedMethod = cache.get("calculationMethod");
        const prefs = getPreferenceValues<Preferences>();

        const city = cachedCity || prefs.city;
        const methodStr = cachedMethod || prefs.calculationMethod || "2";
        const method = parseInt(methodStr);

        if (!city) {
          setError("Please set your city in settings");
          setIsLoading(false);
          return;
        }

        const timings = await fetchPrayerTimesByAddress(city, method);

        if (!timings) {
          setError("Failed to fetch prayer times");
          setIsLoading(false);
          return;
        }

        const today = new Date();
        const prayers: PrayerTime[] = [
          { name: PRAYER_NAMES.Fajr, time: parsePrayerTime(timings.Fajr, today) },
          { name: PRAYER_NAMES.Sunrise, time: parsePrayerTime(timings.Sunrise, today) },
          { name: PRAYER_NAMES.Dhuhr, time: parsePrayerTime(timings.Dhuhr, today) },
          { name: PRAYER_NAMES.Asr, time: parsePrayerTime(timings.Asr, today) },
          { name: PRAYER_NAMES.Maghrib, time: parsePrayerTime(timings.Maghrib, today) },
          { name: PRAYER_NAMES.Isha, time: parsePrayerTime(timings.Isha, today) },
        ].sort((a, b) => a.time.getTime() - b.time.getTime());

        setPrayerTimes(prayers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    loadPrayerTimes();
    const interval = setInterval(loadPrayerTimes, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkCache = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(checkCache);
  }, []);

  const nextPrayer = getNextPrayer(prayerTimes);

  const cachedDisplayMode = cache.get("displayMode") || "countdown";
  const cachedShowTextOnly = cache.get("showTextOnly") || "both";

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
            const now = new Date();
            const timeRemaining = formatTimeRemaining(prayer.time);
            const timeFormatted = formatTime(prayer.time);

            let isCurrent = false;
            if (nextPrayer && isNext) {
              const currentIndex = prayerTimes.findIndex((p) => p.name === nextPrayer.name);
              if (currentIndex > 0) {
                const previousPrayer = prayerTimes[currentIndex - 1];
                isCurrent = prayer.name === previousPrayer.name;
              }
            }

            if (!isCurrent) {
              isCurrent = isCurrentPrayerTime(prayer);
            }

            const isPast = prayer.time < now && !isCurrent;

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
