import { List } from "@raycast/api";
import { useMemo } from "react";
import { useClients, useTimeEntries } from "../../api/hooks.js";
import { type TimeEntry } from "../../api/index.js";
import { formatDate } from "../../utils/formatters.js";
import { useOrgId } from "../../utils/membership.js";
import { djs } from "../../utils/time.js";
import MembershipAccessory from "../shared/MembershipAccessory.js";
import { TimeEntryItem } from "./TimeEntryItem.js";

export function TimeEntryCommand() {
  const orgId = useOrgId();
  const clients = useClients(orgId);
  const timeEntries = useTimeEntries(orgId ?? undefined);

  const active = timeEntries.data?.find((timeEntry) => !timeEntry.end);

  const byDate = useMemo(() => {
    const byDate = timeEntries.data
      ?.filter((te) => te.end) // Filter for finished time entries
      .toSorted((a, b) => a.start.localeCompare(b.start))
      .reduce<Record<string, TimeEntry[]>>((prev, cur) => {
        const dateKey = djs(cur.start).startOf("day").toISOString();
        if (dateKey in prev) {
          prev[dateKey].push(cur);
        } else {
          prev[dateKey] = [cur];
        }
        return prev;
      }, {});

    return byDate ? Object.entries(byDate).toSorted((a, b) => b[0].localeCompare(a[0])) : null;
  }, [timeEntries.data]);

  return (
    <List
      navigationTitle="Search Time Entries"
      isLoading={clients.isLoading || !orgId}
      searchBarAccessory={<MembershipAccessory />}
    >
      {
        <>
          {active && (
            <List.Section title={"Active"}>
              <TimeEntryItem key={active.id} timeEntry={active} />
            </List.Section>
          )}
          {byDate?.map(([date, entries]) => (
            <List.Section key={date} title={formatDate(new Date(date))}>
              {entries.map((timeEntry) => (
                <TimeEntryItem key={timeEntry.id} timeEntry={timeEntry} />
              ))}
            </List.Section>
          ))}
        </>
      }
    </List>
  );
}
