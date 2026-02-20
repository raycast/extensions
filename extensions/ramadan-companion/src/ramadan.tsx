import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
  Toast,
  showToast,
  environment,
  LaunchType,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchPrayerTimes } from "./lib/api";
import { getPreferences } from "./lib/preferences";
import { formatTime, getCountdown, isRamadan } from "./lib/time";
import { updateRamadanMetadata } from "./lib/metadata";
import { useEffect } from "react";

export default function RamadanCommand() {
  if (environment.launchType === LaunchType.Background) {
    updateRamadanMetadata();
    return null;
  }

  useEffect(() => {
    updateRamadanMetadata();
  }, []);

  const prefs = getPreferences();
  const { city, country, method, school, timeFormat, sehriSource } = prefs;

  const { data, isLoading, error } = useCachedPromise(
    fetchPrayerTimes,
    [city, country, method, school],
    {
      keepPreviousData: true,
      onError: async (err) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch prayer times",
          message: err.message,
        });
      },
    },
  );

  if (error && !data) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\n${error.message}\n\nPlease check your preferences (city, country, and method).`}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              onAction={openExtensionPreferences}
              icon={Icon.Gear}
            />
          </ActionPanel>
        }
      />
    );
  }

  const timings = data?.timings;
  const dateInfo = data?.date;
  const meta = data?.meta;

  const rawSehri =
    sehriSource === "imsak" ? (timings?.Imsak ?? "") : (timings?.Fajr ?? "");
  const rawIftar = timings?.Maghrib ?? "";
  const timezone = meta?.timezone ?? "UTC";

  const sehriFormatted = timings ? formatTime(rawSehri, timeFormat) : "—";
  const iftarFormatted = timings ? formatTime(rawIftar, timeFormat) : "—";

  const sehriCountdown = timings ? getCountdown(rawSehri, timezone) : "—";
  const iftarCountdown = timings ? getCountdown(rawIftar, timezone) : "—";

  const hijriMonth = dateInfo?.hijri?.month?.number ?? 0;
  const hijriDay = parseInt(dateInfo?.hijri?.day ?? "0", 10);
  const inRamadan = isRamadan(hijriMonth);

  const hijriDateStr = dateInfo?.hijri
    ? `${dateInfo.hijri.day} ${dateInfo.hijri.month.en} ${dateInfo.hijri.year} AH`
    : "—";
  const gregorianDateStr = dateInfo?.readable ?? "—";

  const nextLabel =
    sehriCountdown !== "Time has passed for today"
      ? `⏳ Next: Sehri in **${sehriCountdown}**`
      : iftarCountdown !== "Time has passed for today"
        ? `⏳ Next: Iftar in **${iftarCountdown}**`
        : "✅ Both times have passed for today";

  const rozaLine = inRamadan
    ? `\n\n🗓 **Roza #${hijriDay}** — Day ${hijriDay} of Ramadan`
    : "";

  const markdown = `# Today's Ramadan Times
${gregorianDateStr} · ${hijriDateStr}${rozaLine}

---

### 🍽 Sehri (${sehriSource === "imsak" ? "Imsak" : "Fajr"})
# ${sehriFormatted}

### 🌅 Iftar (Maghrib)
# ${iftarFormatted}

---

${nextLabel}
`;

  const copyBothText = `Sehri: ${sehriFormatted}\nIftar: ${iftarFormatted}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="City" text={city} />
            <Detail.Metadata.Label title="Country" text={country} />
            <Detail.Metadata.Separator />
            {inRamadan && (
              <Detail.Metadata.Label
                title="Roza"
                text={`Day ${hijriDay} of Ramadan`}
              />
            )}
            <Detail.Metadata.Label title="Hijri Date" text={hijriDateStr} />
            <Detail.Metadata.Label
              title="Method"
              text={meta?.method?.name ?? "—"}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Sunrise"
              text={formatTime(timings?.Sunrise ?? "", timeFormat)}
            />
            <Detail.Metadata.Label
              title="Dhuhr"
              text={formatTime(timings?.Dhuhr ?? "", timeFormat)}
            />
            <Detail.Metadata.Label
              title="Asr"
              text={formatTime(timings?.Asr ?? "", timeFormat)}
            />
            <Detail.Metadata.Label
              title="Isha"
              text={formatTime(timings?.Isha ?? "", timeFormat)}
            />
            {!inRamadan && (
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text="Not Ramadan"
                  color="#888888"
                />
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {timings && (
            <>
              <Action.CopyToClipboard
                title="Copy Sehri Time"
                content={sehriFormatted}
                icon={Icon.Moon}
              />
              <Action.CopyToClipboard
                title="Copy Iftar Time"
                content={iftarFormatted}
                icon={Icon.Sunrise}
              />
              <Action.CopyToClipboard
                title="Copy Both Times"
                content={copyBothText}
                icon={Icon.Clipboard}
              />
            </>
          )}
          <Action.OpenInBrowser
            title="Open Aladhan Website"
            url="https://aladhan.com"
            icon={Icon.Globe}
          />
          <Action
            title="Open Preferences"
            onAction={openExtensionPreferences}
            icon={Icon.Gear}
          />
        </ActionPanel>
      }
    />
  );
}
