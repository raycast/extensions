import { Detail, ActionPanel, Action, Color, Icon } from "@raycast/api";

import { SettingsForm } from "./components/SettingsForm";
import { UpdateUsageForm } from "./components/UpdateUsageForm";
import { useHolidays } from "./hooks/useHolidays";
import { useSettings } from "./hooks/useSettings";
import { getTranslations } from "./i18n/translations";
import { getCountryName } from "./utils/countries";
import { countMonthHolidays, getMonthProgress } from "./utils/dates";
import { buildMarkdown } from "./utils/markdown";
import { computeStatus } from "./utils/status";

export default function Command() {
  const { settings, isLoaded, isFirstRun, updateSettings } = useSettings();
  const t = getTranslations(settings.language);

  const { holidays, isLoading: holidaysLoading } = useHolidays(settings.country);

  if (!isLoaded) {
    return <Detail isLoading />;
  }

  if (isFirstRun) {
    return <SettingsForm settings={settings} isFirstRun t={t} onSave={updateSettings} />;
  }

  const { elapsed, total, monthPct } = getMonthProgress(holidays);
  const monthHolidayCount = countMonthHolidays(holidays);
  const status = computeStatus(settings.usagePct, elapsed, total, settings.requestCost, t);

  const now = new Date();
  const locale = settings.language === "fr" ? "fr-FR" : "en-US";
  const monthName = now.toLocaleString(locale, { month: "long" });
  const year = now.getFullYear();
  const countryName = getCountryName(settings.country, settings.language);

  const markdown = buildMarkdown(settings.usagePct, monthPct, elapsed, total, status, holidaysLoading, t);

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
      ? t.metaDeltaOnTrack
      : status.delta > 0
        ? t.metaDeltaBehind(status.delta)
        : t.metaDeltaAhead(Math.abs(status.delta));

  return (
    <Detail
      isLoading={holidaysLoading && settings.usagePct === 0}
      navigationTitle={t.navTitle}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title={t.actionUpdateUsage}
            icon={Icon.Pencil}
            target={<UpdateUsageForm currentUsage={settings.usagePct} t={t} onSave={updateUsage} />}
          />
          <Action.Push
            title={t.actionOpenSettings}
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            target={<SettingsForm settings={settings} t={t} onSave={updateSettings} />}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={t.metaMonthDone} text={`${monthPct}%`} icon={Icon.Calendar} />
          <Detail.Metadata.Label title={t.metaWorkingDay} text={`${elapsed} / ${total}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title={t.metaYouUsed}
            text={settings.usagePct > 0 ? `${settings.usagePct}%` : "—"}
            icon={Icon.BarChart}
          />
          <Detail.Metadata.TagList title={t.metaDelta}>
            <Detail.Metadata.TagList.Item text={deltaStr} color={deltaColor} />
          </Detail.Metadata.TagList>
          {status.kind !== "idle" && (
            <Detail.Metadata.Label title={t.metaRequestsToday} text={`~${status.requestsToday}`} icon={Icon.Bolt} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={t.metaCountry} text={countryName} icon={Icon.Globe} />
          <Detail.Metadata.Label
            title={t.metaHolidaysTitle}
            text={
              holidaysLoading
                ? t.metaHolidaysLoading
                : monthHolidayCount > 0
                  ? t.metaPublicHolidays(monthHolidayCount, monthName, year)
                  : t.metaHolidaysUnavailable
            }
          />
          <Detail.Metadata.Link title={t.metaDataSource} target="https://date.nager.at/" text="date.nager.at" />
        </Detail.Metadata>
      }
    />
  );
}
