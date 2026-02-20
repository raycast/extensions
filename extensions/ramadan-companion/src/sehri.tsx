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
import { formatTime, getCountdown } from "./lib/time";
import { updateSehriMetadata } from "./lib/metadata";
import { useEffect } from "react";

export default function SehriCommand() {
  if (environment.launchType === LaunchType.Background) {
    updateSehriMetadata();
    return null;
  }

  useEffect(() => {
    updateSehriMetadata();
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
          title: "Failed to fetch Sehri time",
          message: err.message,
        });
      },
    },
  );

  if (error && !data) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\n${error.message}\n\nPlease check your preferences.`}
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
  const meta = data?.meta;
  const timezone = meta?.timezone ?? "UTC";

  const rawSehri =
    sehriSource === "imsak" ? (timings?.Imsak ?? "") : (timings?.Fajr ?? "");
  const sehriFormatted = timings ? formatTime(rawSehri, timeFormat) : "—";
  const countdown = timings ? getCountdown(rawSehri, timezone) : "—";

  const countdownLine =
    countdown === "Time has passed for today"
      ? "✅ Sehri time has passed for today"
      : `⏳ Sehri ends in **${countdown}**`;

  const markdown = `# ${sehriFormatted}
${countdownLine}
`;

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
            <Detail.Metadata.Label
              title="Method"
              text={meta?.method?.name ?? "—"}
            />
            <Detail.Metadata.Label title="Timezone" text={timezone} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {timings && (
            <Action.CopyToClipboard
              title="Copy Sehri Time"
              content={sehriFormatted}
              icon={Icon.Clipboard}
            />
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
