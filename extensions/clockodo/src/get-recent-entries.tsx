import {
  Action,
  ActionPanel,
  Icon,
  List,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Billability, EntryType } from "clockodo";
import { useEffect, useState } from "react";
import { clockodo } from "./clockodo";
import { useRecentEntries } from "./hooks";
import { dayjs, formatDuration } from "./lib";

export default function Command() {
  const { error, data, mutate } = useRecentEntries();
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(data);

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

  if (error) {
    showFailureToast(error, { title: "Failed to fetch entries" });
  }

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Entries..."
      isLoading={data === undefined}
    >
      {filteredList
        ?.filter((entry) => entry.type === EntryType.Time)
        .map((entry) => (
          <List.Item
            key={entry.id}
            icon={entry.timeUntil === null ? Icon.Clock : Icon.Dot}
            title={entry.text ?? ""}
            subtitle={entry.projectName ?? "No Project"}
            accessories={[
              { text: entry.customerName ?? "Unknown Customer" },
              {
                text: formatDuration(
                  entry.duration ?? dayjs().diff(entry.timeSince, "seconds"),
                ),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Start Clock"
                  onAction={async () => {
                    await mutate(
                      clockodo.startClock({
                        projectsId: entry.projectsId,
                        customersId: entry.customersId,
                        servicesId: entry.servicesId,
                        text: entry.text,
                        billable:
                          entry.billable === Billability.Billed
                            ? Billability.Billable
                            : entry.billable,
                      }),
                    );
                    await showHUD("Clock started", {
                      popToRootType: PopToRootType.Immediate,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
