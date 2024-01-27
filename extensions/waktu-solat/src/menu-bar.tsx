// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadTodaySolat, PrayerTime } from "./lib/prayer-times";
import { now } from "moment/moment";

// noinspection JSUnusedGlobalSymbols
export default function Command() {
  const { menuTemplate, afterOffset, beforeOffset, showIcon }: Preferences = getPreferenceValues();
  const [isLoading, setLoading] = useState(true);
  const [prayerTime, setPrayerTime] = useState<PrayerTime>();
  const [zoneId, setZoneId] = useState<string>();

  async function onLoad() {
    const _zid = (await LocalStorage.getItem("zone")) || "WLY01";
    setZoneId(_zid);
    setPrayerTime(await loadTodaySolat(_zid));
    setLoading(false);
  }

  useEffect(() => {
    onLoad();
  }, []);

  const current = prayerTime?.items?.find((p) => p.isCurrent);
  const nextPrayer = prayerTime?.items?.find((p) => p.isNext);
  const nextDiff = Math.abs(nextPrayer?.time.diff(now(), "minutes", true) || 0);
  const currentDiff = Math.abs(current?.time.diff(now(), "minutes", true) || 0);
  const menuPrayer =
    nextDiff < (Math.abs(beforeOffset) || 30)
      ? nextPrayer
      : currentDiff < (Math.abs(afterOffset) || 30)
        ? current
        : null;
  const title = menuTemplate?.replace("$name", menuPrayer?.label).replace("$time", menuPrayer?.value);
  // const icon = showIcon ? "🕌 " : "";
  const _title = (!isLoading || undefined) && menuPrayer && `${title}`;
  const shouldHide = !_title && !showIcon;
  const upcomingPrayers = prayerTime?.items?.filter((p) => p.time.isAfter(now()));
  const pastPrayers = prayerTime?.items?.filter((p) => p.time.isBefore(current.time));
  return (
    <MenuBarExtra
      icon={(showIcon && "mosque01.svg") || undefined}
      title={_title}
      tooltip={`${current?.label} since ${current?.value}, Next: ${nextPrayer?.label} at ${nextPrayer?.value}`}
      isLoading={isLoading || shouldHide}
    >
      <MenuBarExtra.Section title={`Current [${zoneId}]`}>
        <MenuBarExtra.Item
          // icon={"mosque-color.svg"}
          icon={Icon.CircleProgress50}
          key={current?.label}
          title={`${current?.label}: `}
          subtitle={`${current?.value}`}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
      {upcomingPrayers?.length > 0 && (
        <MenuBarExtra.Section title="Upcoming">
          {upcomingPrayers?.map((item) => (
            <MenuBarExtra.Item
              icon={Icon.Circle}
              key={item.label}
              title={`${item.label}: `}
              subtitle={`${item.value}`}
              onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {pastPrayers?.length > 0 && (
        <MenuBarExtra.Section title="Past">
          {pastPrayers?.map((item) => (
            <MenuBarExtra.Item
              icon={Icon.CircleProgress100}
              key={item.label}
              title={`${item.label}: `}
              subtitle={`${item.value}`}
              onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Cog} title="Settings" onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
