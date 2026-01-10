import { useEffect, useState, useMemo } from "react";
import { List, ActionPanel, Action, Icon, Color, Cache, launchCommand, LaunchType } from "@raycast/api";
import {
  usePrayerTimes,
  useCurrentTime,
  isCurrentPrayerTime,
  formatTime,
  formatTimeRemaining,
  PRAYER_NAMES,
  type PrayerTime,
} from "./utils";

const cache = new Cache();

export default function Command() {
  const { prayerTimes, nextPrayer, isLoading, error } = usePrayerTimes();
  const currentTime = useCurrentTime(nextPrayer?.time);
  const [prayedPrayers, setPrayedPrayers] = useState<Set<string>>(new Set());

  const getTodayKey = () => {
    const today = new Date();
    return `prayed_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}`;
  };

  useEffect(() => {
    const todayKey = getTodayKey();
    const cached = cache.get(todayKey);
    if (cached) {
      try {
        const prayed = JSON.parse(cached) as string[];
        setPrayedPrayers(new Set(prayed));
      } catch {
        setPrayedPrayers(new Set());
      }
    }
  }, []);

  const previousPrayer = useMemo(() => {
    if (!nextPrayer || prayerTimes.length === 0) return null;
    const nextIndex = prayerTimes.findIndex((p) => p.name === nextPrayer.name);
    if (nextIndex > 0) {
      return prayerTimes[nextIndex - 1];
    }
    return prayerTimes[prayerTimes.length - 1];
  }, [nextPrayer, prayerTimes]);

  const togglePrayerStatus = (prayerName: string) => {
    const newPrayed = new Set(prayedPrayers);
    if (newPrayed.has(prayerName)) {
      newPrayed.delete(prayerName);
    } else {
      newPrayed.add(prayerName);
    }
    setPrayedPrayers(newPrayed);
    const todayKey = getTodayKey();
    cache.set(todayKey, JSON.stringify(Array.from(newPrayed)));
  };

  if (error) {
    return (
      <List>
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          subtitle={error}
          actions={
            <ActionPanel>
              <Action
                title="Open Settings"
                icon={Icon.Gear}
                onAction={() => {
                  launchCommand({
                    name: "settings",
                    ownerOrAuthorName: "Hadi04",
                    extensionName: "prayer-times",
                    type: LaunchType.UserInitiated,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const getPrayerIcon = (prayer: PrayerTime) => {
    if (prayer.name === PRAYER_NAMES.Sunrise) {
      return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
    }
    if (isCurrentPrayerTime(prayer)) {
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    }
    if (prayer.name === nextPrayer?.name) {
      return { source: Icon.Clock, tintColor: Color.Blue };
    }
    if (prayedPrayers.has(prayer.name)) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  };

  const getPrayerAccessories = (prayer: PrayerTime) => {
    const timeFormatted = formatTime(prayer.time);
    const timeRemaining = formatTimeRemaining(prayer.time);
    const isPrayed = prayedPrayers.has(prayer.name);
    const isCurrent = isCurrentPrayerTime(prayer);
    const isNext = prayer.name === nextPrayer?.name;
    const isPrevious = prayer.name === previousPrayer?.name;

    const accessories = [];

    if (isCurrent) {
      accessories.push({ text: `Now • ${timeFormatted}`, icon: { source: Icon.Dot, tintColor: Color.Green } });
    } else if (isNext) {
      accessories.push({ text: `${timeRemaining} • ${timeFormatted}` });
    } else if (isPrevious) {
      accessories.push({ text: `Now • ${timeFormatted}` });
    } else if (isPrayed) {
      accessories.push({ text: timeFormatted });
    } else if (prayer.time < currentTime) {
      accessories.push({ text: timeFormatted });
    } else {
      accessories.push({ text: `${timeRemaining} • ${timeFormatted}` });
    }

    return accessories;
  };

  const getPrayerDisplayName = (prayer: PrayerTime) => {
    const isFriday = new Date().getDay() === 5;
    if (prayer.name === PRAYER_NAMES.Dhuhr && isFriday) {
      return "Jummah";
    }
    return prayer.name;
  };

  return (
    <List isLoading={isLoading}>
      {nextPrayer && (
        <List.Section title="Next Prayer">
          <List.Item
            icon={getPrayerIcon(nextPrayer)}
            title={getPrayerDisplayName(nextPrayer)}
            subtitle="Next Prayer"
            accessories={getPrayerAccessories(nextPrayer)}
          />
        </List.Section>
      )}

      <List.Section title="Today's Prayer Times">
        {prayerTimes.map((prayer: PrayerTime) => {
          const isCurrent = isCurrentPrayerTime(prayer);
          const isNext = prayer.name === nextPrayer?.name;
          const isPrayed = prayedPrayers.has(prayer.name);
          const isPast = prayer.time < currentTime && !isCurrent;

          let subtitle = "Upcoming";
          if (isCurrent) subtitle = "Current Prayer";
          else if (isNext) subtitle = "Next Prayer";
          else if (isPrayed) subtitle = "Prayed";
          else if (isPast) subtitle = "";

          const isSunrise = prayer.name === PRAYER_NAMES.Sunrise;
          const isUpcomingAfterNext = prayer.time > currentTime && prayer.name !== nextPrayer?.name;
          const canMarkAsPrayed = !isSunrise && !isUpcomingAfterNext;

          return (
            <List.Item
              key={prayer.name}
              icon={getPrayerIcon(prayer)}
              title={getPrayerDisplayName(prayer)}
              subtitle={subtitle}
              accessories={getPrayerAccessories(prayer)}
              actions={
                <ActionPanel>
                  {canMarkAsPrayed && (
                    <Action
                      title={isPrayed ? "Mark as Not Prayed" : "Mark as Prayed"}
                      icon={isPrayed ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => togglePrayerStatus(prayer.name)}
                    />
                  )}
                  {!isPast && (
                    <Action.CopyToClipboard title="Copy Countdown" content={formatTimeRemaining(prayer.time)} />
                  )}
                  <Action
                    title="Open Settings"
                    icon={Icon.Gear}
                    onAction={() => {
                      launchCommand({
                        name: "settings",
                        ownerOrAuthorName: "Hadi04",
                        extensionName: "prayer-times",
                        type: LaunchType.UserInitiated,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
