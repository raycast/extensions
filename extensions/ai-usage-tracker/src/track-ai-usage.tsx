import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";

import { SettingsForm } from "./components/SettingsForm";
import { UpdateUsageForm } from "./components/UpdateUsageForm";
import { useHolidays } from "./hooks/useHolidays";
import { useSettings } from "./hooks/useSettings";
import { contentText } from "./utils/content-text";
import { getCountryName } from "./utils/countries";
import { countMonthHolidays, getMonthProgress } from "./utils/dates";
import { buildMarkdown } from "./utils/markdown";
import { computeStatus } from "./utils/status";

export default function Command() {
  const { settings, isLoaded, isFirstRun, updateSettings } = useSettings();

  const { holidays, isLoading: holidaysLoading } = useHolidays(settings.country);

  if (!isLoaded) {
    return <Detail isLoading />;
  }

  if (isFirstRun) {
    return <SettingsForm settings={settings} isFirstRun onSave={updateSettings} />;
  }

  const { elapsed, total, monthPct } = getMonthProgress(holidays);
  const monthHolidayCount = countMonthHolidays(holidays);
  const status = computeStatus(settings.usagePct, elapsed, total, settings.requestCost);

  const now = new Date();
  const monthName = now.toLocaleString(undefined, { month: "long" });
  const year = now.getFullYear();
  const countryName = getCountryName(settings.country);

  const markdown = buildMarkdown(settings.usagePct, monthPct, elapsed, total, status, holidaysLoading);

  async function updateUsage(n: number) {
    await updateSettings({ ...settings, usagePct: n });
  }

  const deltaColor =
    status.kind === "ahead"
      ? Color.Green
      : status.kind === "behind"
        ? Color.Red
        : status.kind === "neutral"
          ? Color.Yellow
          : Color.SecondaryText;

  const deltaStr =
    status.delta === 0
      ? contentText.metaDeltaOnTrack
      : status.delta > 0
        ? contentText.metaDeltaBehind(status.delta)
        : contentText.metaDeltaAhead(Math.abs(status.delta));

  return (
    <Detail
      isLoading={holidaysLoading && settings.usagePct === 0}
      navigationTitle={contentText.navTitle}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title={contentText.actionUpdateUsage}
            icon={Icon.Pencil}
            target={<UpdateUsageForm currentUsage={settings.usagePct} onSave={updateUsage} />}
          />
          <Action.Push
            title={contentText.actionOpenSettings}
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            target={<SettingsForm settings={settings} onSave={updateSettings} />}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={contentText.metaMonthDone} text={`${monthPct}%`} icon={Icon.Calendar} />
          <Detail.Metadata.Label title={contentText.metaWorkingDay} text={`${elapsed} / ${total}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title={contentText.metaYouUsed}
            text={settings.usagePct > 0 ? `${settings.usagePct}%` : "—"}
            icon={Icon.BarChart}
          />
          <Detail.Metadata.TagList title={contentText.metaDelta}>
            <Detail.Metadata.TagList.Item text={deltaStr} color={deltaColor} />
          </Detail.Metadata.TagList>
          {status.kind !== "idle" && (
            <Detail.Metadata.Label
              title={contentText.metaRequestsToday}
              text={`~${status.requestsToday}`}
              icon={Icon.Bolt}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={contentText.metaCountry} text={countryName} icon={Icon.Globe} />
          <Detail.Metadata.Label
            title={contentText.metaHolidaysTitle}
            text={
              holidaysLoading
                ? contentText.metaHolidaysLoading
                : monthHolidayCount > 0
                  ? contentText.metaPublicHolidays(monthHolidayCount, monthName, year)
                  : contentText.metaHolidaysUnavailable
            }
          />
          <Detail.Metadata.Link
            title={contentText.metaDataSource}
            target="https://date.nager.at/"
            text="date.nager.at"
          />
        </Detail.Metadata>
      }
    />
  );
}
