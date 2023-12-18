// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadTodaySolat, PrayerTime } from "./lib/prayer-times";
import { now } from "moment/moment";

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
  const icon = showIcon ? "🕌 " : "";
  return (
    <MenuBarExtra
      // icon={"🕌"}
      title={(!isLoading || undefined) && menuPrayer && `${icon}${title}`}
      tooltip={`${current?.label} since ${current?.value}, Next: ${nextPrayer?.label} at ${nextPrayer?.value}`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={`Current [${zoneId}]`}>
        <MenuBarExtra.Item
          icon={"🕌"}
          key={current?.label}
          title={`${current?.label}: `}
          subtitle={`${current?.value}`}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Upcoming">
        {prayerTime?.items
          ?.filter((p) => p.time.isAfter(now()))
          .map((item) => (
            <MenuBarExtra.Item
              icon={"🕌"}
              key={item.label}
              title={`${item.label}: `}
              subtitle={`${item.value}`}
              onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
            />
          ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Past">
        {prayerTime?.items
          ?.filter((p) => p.time.isBefore(current.time))
          .map((item) => (
            <MenuBarExtra.Item
              icon={"🕌"}
              key={item.label}
              title={`${item.label}: `}
              subtitle={`${item.value}`}
              onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
            />
          ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon="⚙️" title="Settings" onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
