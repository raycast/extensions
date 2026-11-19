import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  getAbsences,
  getOrganizations,
  type Absence,
  type Organization,
} from "./api";
import { ListErrorView } from "./error-view";

type StatusFilter = "all" | "requested" | "approved" | "rejected" | "cancelled";

function statusColor(status?: string): Color {
  switch (status?.toLowerCase()) {
    case "approved":
      return Color.Green;
    case "rejected":
      return Color.Red;
    case "cancelled":
      return Color.SecondaryText;
    case "requested":
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

function fmtDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function dateRange(absence: Absence): string {
  const start = fmtDate(absence.startDateTime);
  const end = fmtDate(absence.endDateTime);
  if (start === end) return start;
  return `${start} – ${end}`;
}

export default function Absences() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const orgs = useCachedPromise(getOrganizations, [], {
    initialData: [] as Organization[],
    failureToastOptions: { title: "Failed to load organizations" },
  });

  useEffect(() => {
    if (!orgId && orgs.data.length > 0) setOrgId(orgs.data[0].id);
  }, [orgs.data, orgId]);

  const absences = useCachedPromise(
    async (id: string | undefined, status: StatusFilter) => {
      if (!id) return [];
      return getAbsences(id, { status: status === "all" ? undefined : status });
    },
    [orgId, filter],
    {
      keepPreviousData: true,
      initialData: [] as Absence[],
      failureToastOptions: { title: "Failed to load absences" },
    },
  );

  const grouped = useMemo(() => {
    return absences.data.reduce(
      (acc, absence) => {
        const key = absence.absenceType?.name ?? "Other";
        if (!acc[key]) acc[key] = [];
        acc[key].push(absence);
        return acc;
      },
      {} as Record<string, Absence[]>,
    );
  }, [absences.data]);

  const failure = orgs.error ?? absences.error;
  if (failure && absences.data.length === 0) {
    return (
      <List>
        <ListErrorView
          error={failure}
          what="absences"
          onRetry={() =>
            orgs.error ? orgs.revalidate() : absences.revalidate()
          }
        />
      </List>
    );
  }

  if (!orgs.isLoading && orgs.data.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Calendar}
          title="You don't belong to any organization yet."
          description="Absences are an organization feature."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={orgs.isLoading || absences.isLoading}
      searchBarPlaceholder="Search absences..."
      searchBarAccessory={
        orgs.data.length > 0 ? (
          <List.Dropdown
            tooltip="Organization"
            storeValue
            value={orgId}
            onChange={setOrgId}
          >
            {orgs.data.map((org) => (
              <List.Dropdown.Item
                key={org.id}
                title={org.name}
                value={org.id}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.Section title="Filter">
        <List.Item
          icon={Icon.Filter}
          title={`Status: ${filter}`}
          subtitle="Press Enter to cycle"
          actions={
            <ActionPanel>
              <Action
                title="Next Status"
                icon={Icon.ArrowRight}
                onAction={() => {
                  const order: StatusFilter[] = [
                    "all",
                    "requested",
                    "approved",
                    "rejected",
                    "cancelled",
                  ];
                  setFilter(order[(order.indexOf(filter) + 1) % order.length]);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {Object.entries(grouped).map(([type, items]) => (
        <List.Section
          key={type}
          title={type}
          subtitle={`${items.length} entr${items.length === 1 ? "y" : "ies"}`}
        >
          {items.map((absence) => (
            <List.Item
              key={absence.id}
              icon={{
                source: Icon.Calendar,
                tintColor: statusColor(absence.status),
              }}
              title={dateRange(absence)}
              subtitle={absence.reason || absence.member?.displayName || ""}
              accessories={[
                ...(absence.totalDays
                  ? [{ text: `${absence.totalDays}d`, icon: Icon.Sun }]
                  : []),
                ...(absence.status
                  ? [
                      {
                        tag: {
                          value: absence.status,
                          color: statusColor(absence.status),
                        },
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Timesheet"
                    url={`https://my.timesheet.io/organizations/${orgId}/absences/edit/${absence.id}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Absence ID"
                    content={absence.id}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => absences.revalidate()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
