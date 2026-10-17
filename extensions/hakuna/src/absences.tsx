import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { AbsenceResponse, HakunaClient } from "./hakuna-api";
import { getSettings } from "./settings";

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getMonthLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function absenceIcon(absence: AbsenceResponse): {
  source: Icon;
} {
  if (absence.absence_type.is_vacation) return { source: Icon.AirplaneTakeoff };
  if (absence.absence_type.grants_work_time)
    return { source: Icon.PauseFilled };
  return { source: Icon.Leaf };
}

function halfDayLabel(absence: AbsenceResponse): string | null {
  if (absence.first_half_day && !absence.second_half_day) return "Morning";
  if (!absence.first_half_day && absence.second_half_day) return "Afternoon";
  return null;
}

function absenceDateRange(absence: AbsenceResponse): string {
  if (absence.start_date === absence.end_date) {
    const dateStr = formatDate(absence.start_date);
    const half = halfDayLabel(absence);
    return half ? `${dateStr} (${half.toLowerCase()})` : dateStr;
  }
  return `${formatDate(absence.start_date)} – ${formatDate(absence.end_date)}`;
}

function AbsenceDetail({ absence }: { absence: AbsenceResponse }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item
              text={absence.absence_type.name}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Start"
            text={absence.start_date}
          />
          <List.Item.Detail.Metadata.Label
            title="End"
            text={absence.end_date}
          />
          {halfDayLabel(absence) && (
            <List.Item.Detail.Metadata.Label
              title="Half Day"
              text={halfDayLabel(absence)!}
            />
          )}
          {absence.is_recurring && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Recurring" text="Yes" />
              {absence.weekly_repeat_interval != null && (
                <List.Item.Detail.Metadata.Label
                  title="Interval"
                  text={`Every ${absence.weekly_repeat_interval} week${absence.weekly_repeat_interval !== 1 ? "s" : ""}`}
                />
              )}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command({
  userId,
  userName,
}: { userId?: number; userName?: string } = {}) {
  const { apiToken } = getSettings();
  const currentYear = new Date().getFullYear();
  const client = new HakunaClient(apiToken);
  const [year, setYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: absences, isLoading: absencesLoading } = useCachedPromise(
    (y: number, uid: number | undefined) => client.getAbsences(y, uid),
    [year, userId],
  );

  const { data: overview, isLoading: overviewLoading } = useCachedPromise(
    (uid: number | undefined) => client.getOverview(uid),
    [userId],
  );

  const { data: absenceTypes, isLoading: typesLoading } = useCachedPromise(
    () => client.getAbsenceTypes(),
    [],
  );

  const isLoading = absencesLoading || overviewLoading || typesLoading;

  const filtered = (absences ?? []).filter(
    (a) => typeFilter === "all" || String(a.absence_type.id) === typeFilter,
  );

  const byMonth = filtered.reduce<Record<string, AbsenceResponse[]>>(
    (acc, absence) => {
      const key = getMonthLabel(absence.start_date);
      (acc[key] ??= []).push(absence);
      return acc;
    },
    {},
  );

  const vacation = overview?.vacation;
  const navigationTitle =
    year === currentYear && vacation !== undefined
      ? `${vacation.remaining_days} vacation days remaining`
      : `Absences ${year}`;

  const yearActions = (
    <ActionPanel.Section title={`Year: ${year}`}>
      <Action
        title="Current Year"
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "0" },
          Windows: { modifiers: ["ctrl"], key: "0" },
        }}
        onAction={() => setYear(currentYear)}
      />
      <Action
        title="Previous Year"
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "h" },
          Windows: { modifiers: ["ctrl"], key: "h" },
        }}
        onAction={() => setYear((y) => y - 1)}
      />
      <Action
        title="Next Year"
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "l" },
          Windows: { modifiers: ["ctrl"], key: "l" },
        }}
        onAction={() => setYear((y) => y + 1)}
      />
    </ActionPanel.Section>
  );

  const dropdown = (
    <List.Dropdown
      tooltip="Filter by Type"
      value={typeFilter}
      onChange={setTypeFilter}
    >
      <List.Dropdown.Item title="All Types" value="all" />
      {(absenceTypes ?? []).map((t) => (
        <List.Dropdown.Item key={t.id} title={t.name} value={String(t.id)} />
      ))}
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={navigationTitle}
      searchBarAccessory={dropdown}
      searchBarPlaceholder={userName ? `Absences of ${userName}` : undefined}
    >
      {!isLoading && Object.keys(byMonth).length === 0 && (
        <List.EmptyView
          title={`No absences in ${year}`}
          actions={<ActionPanel>{yearActions}</ActionPanel>}
        />
      )}
      {Object.entries(byMonth).map(([month, items]) => (
        <List.Section key={month} title={month}>
          {items.map((absence) => (
            <List.Item
              key={absence.id}
              title={absence.absence_type.name}
              subtitle={absenceDateRange(absence)}
              icon={absenceIcon(absence)}
              detail={<AbsenceDetail absence={absence} />}
              actions={<ActionPanel>{yearActions}</ActionPanel>}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
