import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { differenceInMilliseconds, isAfter, isBefore } from "date-fns";
import { loadStoredPrayerTime, PrayerTime, PrayerTimeItem } from "./lib/prayer-times";

function applyMenuTemplate(template: string, label: string, value: string) {
  return template.split("$name").join(label).split("$time").join(value);
}

function getPrayerState(prayerTime: PrayerTime | undefined, beforeOffset: string, afterOffset: string) {
  const items = prayerTime?.items ?? [];
  const current = items.find((item) => item.isCurrent);
  const nextPrayer = items.find((item) => item.isNext);

  const now = new Date();
  const nextDiff = nextPrayer ? Math.abs(differenceInMilliseconds(nextPrayer.time, now) / 60_000) : 0;
  const currentDiff = current ? Math.abs(differenceInMilliseconds(current.time, now) / 60_000) : 0;

  const beforeMinutes = Math.abs(Number(beforeOffset)) || 30;
  const afterMinutes = Math.abs(Number(afterOffset)) || 30;

  let menuPrayer: PrayerTimeItem | undefined;
  if (nextDiff < beforeMinutes) {
    menuPrayer = nextPrayer;
  } else if (currentDiff < afterMinutes) {
    menuPrayer = current;
  }

  return {
    current,
    nextPrayer,
    menuPrayer,
    upcomingPrayers: items.filter((item) => isAfter(item.time, now)),
    pastPrayers: current ? items.filter((item) => isBefore(item.time, current.time)) : [],
    hasPrayerTimes: items.length > 0,
  };
}

function PrayerMenuItem({ item, icon }: { item: PrayerTimeItem; icon: Icon }) {
  return (
    <MenuBarExtra.Item
      icon={icon}
      key={item.label}
      title={`${item.label}: `}
      subtitle={item.value}
      onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
    />
  );
}

export default function Command() {
  const { data, isLoading } = usePromise(loadStoredPrayerTime);

  const preferences = getPreferenceValues<Preferences>();
  const prayerState = getPrayerState(data?.prayerTime, preferences.beforeOffset, preferences.afterOffset);

  const menuTitle = prayerState.menuPrayer
    ? applyMenuTemplate(preferences.menuTemplate, prayerState.menuPrayer.label, prayerState.menuPrayer.value)
    : undefined;

  const title = !isLoading && prayerState.menuPrayer ? menuTitle : undefined;
  const icon = preferences.iconColor === "black" ? "mosque01-black.svg" : "mosque01.svg";

  return (
    <MenuBarExtra
      icon={preferences.showIcon ? icon : undefined}
      title={title}
      tooltip={`${prayerState.current?.label} since ${prayerState.current?.value}, Next: ${prayerState.nextPrayer?.label} at ${prayerState.nextPrayer?.value}`}
      isLoading={isLoading || (!title && !preferences.showIcon)}
    >
      {prayerState.hasPrayerTimes ? (
        <>
          <MenuBarExtra.Section title={`Current [${data?.zoneId}]`}>
            <MenuBarExtra.Item
              icon={Icon.CircleProgress50}
              key={prayerState.current?.label}
              title={`${prayerState.current?.label}: `}
              subtitle={`${prayerState.current?.value}`}
              onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
          {prayerState.upcomingPrayers.length > 0 && (
            <MenuBarExtra.Section title="Upcoming">
              {prayerState.upcomingPrayers.map((item) => (
                <PrayerMenuItem item={item} icon={Icon.Circle} />
              ))}
            </MenuBarExtra.Section>
          )}
          {prayerState.pastPrayers.length > 0 && (
            <MenuBarExtra.Section title="Past">
              {prayerState.pastPrayers.map((item) => (
                <PrayerMenuItem item={item} icon={Icon.CircleProgress100} />
              ))}
            </MenuBarExtra.Section>
          )}
        </>
      ) : (
        <MenuBarExtra.Item
          icon={Icon.ExclamationMark}
          title={isLoading ? "Loading prayer times…" : "No prayer times available"}
          subtitle={isLoading ? undefined : "Open Waktu Solat to try again"}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Cog} title="Settings" onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
