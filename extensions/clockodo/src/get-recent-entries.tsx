import { Action, ActionPanel, Icon, List, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Billability, EntryType, type TimeEntry } from "clockodo";
import { useEffect, useMemo, useState } from "react";
import { clockodo } from "./clockodo";
import { useRecentEntries } from "./hooks";
import { dayjs, formatDuration } from "./lib";

type RecentTimeEntry = TimeEntry & {
  projectName: string | null | undefined;
  customerName: string | null | undefined;
};

export default function Command() {
  const { error, data, mutate } = useRecentEntries();
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(data);

  useEffect(() => {
    if (error) {
      void showFailureToast(error, { title: "Failed to fetch entries" });
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      const normalizedSearchText = searchText.toLowerCase();

      setFilteredList(
        data.filter(
          (item) =>
            item.customerName?.toLowerCase().includes(normalizedSearchText) ||
            item.projectName?.toLowerCase().includes(normalizedSearchText) ||
            item.text?.toLowerCase().includes(normalizedSearchText),
        ),
      );
    }
  }, [searchText, data]);

  const timeEntries = useMemo(
    () => (filteredList ?? []).filter((entry): entry is RecentTimeEntry => entry.type === EntryType.Time),
    [filteredList],
  );

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Entries..."
      isLoading={data === undefined}
    >
      {timeEntries.map((entry) => (
        <List.Item
          key={entry.id}
          icon={entry.timeUntil === null ? Icon.Clock : Icon.Dot}
          title={entry.text ?? ""}
          subtitle={entry.projectName ?? "No Project"}
          accessories={[
            { text: entry.customerName ?? "Unknown Customer" },
            {
              text: formatDuration(entry.duration ?? dayjs().diff(entry.timeSince, "seconds")),
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Start Clock"
                onAction={async () => {
                  try {
                    await mutate(
                      clockodo.startClock({
                        projectsId: entry.projectsId,
                        customersId: entry.customersId,
                        servicesId: entry.servicesId,
                        text: entry.text,
                        billable: entry.billable === Billability.Billed ? Billability.Billable : entry.billable,
                      }),
                    );
                    await showHUD("Clock started", {
                      popToRootType: PopToRootType.Immediate,
                    });
                  } catch (e) {
                    await showFailureToast(e, { title: "Failed to start clock" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title={searchText ? "No Matching Entries" : "No Recent Entries"}
        description={searchText ? "Try a different search term." : "No time entries in the last few days."}
      />
    </List>
  );
}
