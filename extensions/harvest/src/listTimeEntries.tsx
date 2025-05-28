import {
  Action,
  ActionPanel,
  Alert,
  Application,
  Color,
  confirmAlert,
  getApplications,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  deleteTimeEntry,
  newTimeEntry,
  refreshMenuBar,
  restartTimer,
  stopTimer,
  useCompany,
  formatHours,
  useMyTimeEntries,
} from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";
import New from "./new";
import { execSync } from "child_process";
import { NewTimeEntryDuration, NewTimeEntryStartEnd } from "./services/requestTypes";
import { sumBy } from "lodash";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import isYesterday from "dayjs/plugin/isYesterday";
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(relativeTime);

export interface Preferences {
  sortBy: "updated-desc" | "updated-asc" | "created-desc" | "created-asc" | "none";
}

export default function Command() {
  const [viewDate, setViewDate] = useState<Date | null>(null);
  const { data: items, isLoading, revalidate } = useMyTimeEntries(viewDate);

  const [navigationTitle, setNavigationTitle] = useState("Today's Timesheet");
  const [navSubtitle, setNavSubtitle] = useState("");
  const { data: company } = useCompany();

  const timeEntries = useMemo(() => {
    const timeEntries: HarvestTimeEntry[] = items;

    const { sortBy }: Preferences = getPreferenceValues();
    switch (sortBy) {
      case "updated-desc": {
        timeEntries.sort((a, b) => {
          if (dayjs(a.updated_at).isSame(dayjs(b.updated_at))) {
            return b.is_running ? 1 : -1;
          }
          return dayjs(a.updated_at).isAfter(dayjs(b.updated_at)) ? -1 : 1;
        });
        break;
      }
      case "created-desc": {
        timeEntries.sort((a, b) => {
          if (dayjs(a.created_at).isSame(dayjs(b.created_at))) {
            return b.is_running ? 1 : -1;
          }
          return dayjs(a.created_at).isAfter(dayjs(b.created_at)) ? -1 : 1;
        });
        break;
      }
      case "updated-asc": {
        timeEntries.sort((a, b) => {
          if (dayjs(a.updated_at).isSame(dayjs(b.updated_at))) {
            return b.is_running ? 1 : -1;
          }
          return dayjs(a.updated_at).isAfter(dayjs(b.updated_at)) ? 1 : -1;
        });
        break;
      }
      case "created-asc": {
        timeEntries.sort((a, b) => {
          if (dayjs(a.created_at).isSame(dayjs(b.created_at))) {
            return b.is_running ? 1 : -1;
          }
          return dayjs(a.created_at).isAfter(dayjs(b.created_at)) ? 1 : -1;
        });
        break;
      }
    }

    return timeEntries;
  }, [items]);

  useEffect(() => {
    const dayTotal = sumBy(timeEntries, "hours")?.toFixed(2) ?? "";
    setNavSubtitle(formatHours(dayTotal, company));
  }, [timeEntries, company]);

  async function changeViewDate(date: Date) {
    // const relative = dayjs(date).fromNow();
    setNavSubtitle("");
    // setIsLoading(true);
    if (dayjs(date).isToday()) {
      setNavigationTitle("Today's Timesheet");
    } else if (dayjs(date).isTomorrow()) {
      setNavigationTitle("Tomorrow's Timesheet");
    } else if (dayjs(date).isYesterday()) {
      setNavigationTitle("Yesterday's Timesheet");
    } else {
      setNavigationTitle(dayjs(date).format("ddd, MMM D"));
    }
    setViewDate(date);
  }

  function ToggleTimerAction({ entry, onComplete }: { entry: HarvestTimeEntry; onComplete: () => Promise<void> }) {
    const param: NewTimeEntryDuration | NewTimeEntryStartEnd = {
      project_id: entry.project.id,
      task_id: entry.task.id,
      spent_date: entry.spent_date,
      notes: entry.notes,
    };
    if (entry.external_reference) {
      param.external_reference = entry.external_reference;
    }

    async function startOrStopTimer() {
      const toast = new Toast({ style: Toast.Style.Animated, title: "Loading..." });
      await toast.show();
      try {
        if (entry.is_running) {
          await stopTimer(entry);
        } else {
          await restartTimer(entry);
        }
        await toast.hide();
      } catch {
        await showToast(Toast.Style.Failure, "Error", `Could not ${entry.is_running ? "stop" : "start"} your timer`);
      }
      revalidate();
      await onComplete();
    }

    return dayjs(viewDate ?? undefined).isToday() ? (
      <Action title={entry.is_running ? "Stop Timer" : "Start Timer"} icon={Icon.Clock} onAction={startOrStopTimer} />
    ) : (
      <>
        <Action
          title="Start on Today"
          icon={Icon.Calendar}
          onAction={async () => {
            // make sure no other timer is running
            await stopTimer();

            param.spent_date = dayjs().format("YYYY-MM-DD");
            await newTimeEntry(param);
            await changeViewDate(new Date());
            revalidate();
          }}
        />
        <Action
          title={entry.is_running ? "Stop Timer" : `Start on ${dayjs(viewDate).format("dddd")}`}
          icon={Icon.Clock}
          onAction={async () => {
            // make sure no other timer is running
            await stopTimer();
            // then toggle the selected timer
            await startOrStopTimer();
          }}
        />
      </>
    );
  }

  function SwitchViewDateActions() {
    return (
      <>
        <Action
          title="Previous Day"
          icon={Icon.ArrowLeft}
          shortcut={{ key: "arrowLeft", modifiers: ["cmd"] }}
          onAction={() => {
            changeViewDate(
              dayjs(viewDate ?? undefined)
                .subtract(1, "d")
                .toDate()
            );
          }}
        />
        <Action
          title="Next Day"
          icon={Icon.ArrowRight}
          shortcut={{ key: "arrowRight", modifiers: ["cmd"] }}
          onAction={() => {
            changeViewDate(
              dayjs(viewDate ?? undefined)
                .add(1, "d")
                .toDate()
            );
          }}
        />
        {!dayjs(viewDate).isToday() && (
          <Action
            title="Back to Today"
            icon={Icon.Calendar}
            shortcut={{ key: "t", modifiers: ["cmd"] }}
            onAction={() => {
              changeViewDate(new Date());
            }}
          />
        )}
      </>
    );
  }

  const init = async () => {
    await refreshMenuBar();
    revalidate();
  };

  return (
    <List
      searchBarPlaceholder="Filter Time Entries"
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Harvest">
            <NewEntryAction onSave={init} viewDate={viewDate} />
            <OpenHarvestAppAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Change Dates">
            <SwitchViewDateActions />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title={`${navigationTitle}`} subtitle={navSubtitle}>
        {timeEntries.map((entry) => {
          return (
            <List.Item
              id={entry.id.toString()}
              key={entry.id}
              title={entry.project.name}
              accessoryTitle={`${entry.client.name}${entry.client.name && entry.task.name ? " | " : ""}${
                entry.task.name
              } | ${formatHours(entry.hours.toFixed(2), company)}`}
              accessoryIcon={
                entry.external_reference ? { source: entry.external_reference.service_icon_url } : undefined
              }
              subtitle={entry.notes}
              keywords={entry.notes
                ?.split(" ")
                .concat(entry.client?.name?.split(" "))
                .concat(entry.task?.name?.split(" "))}
              icon={entry.is_running ? { tintColor: Color.Orange, source: Icon.Clock } : undefined}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={`${entry.project.name} | ${entry.client.name}`}>
                    <ToggleTimerAction onComplete={init} entry={entry} />
                    <EditEntryAction onSave={init} entry={entry} viewDate={viewDate} />
                    <DuplicateEntryAction onSave={init} entry={entry} viewDate={viewDate} />
                    <DeleteEntryAction onComplete={init} entry={entry} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Harvest">
                    <NewEntryAction onSave={init} viewDate={viewDate} />
                    <OpenHarvestAppAction />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Change Dates">
                    <SwitchViewDateActions />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function NewEntryAction({
  onSave = async () => {
    return;
  },
  viewDate = new Date(),
}: {
  onSave: () => Promise<void>;
  viewDate: Date | null;
}) {
  return (
    <Action.Push
      target={<New onSave={onSave} viewDate={viewDate} />}
      title="New Time Entry"
      shortcut={{ key: "n", modifiers: ["cmd"] }}
      icon={Icon.Plus}
    />
  );
}

function EditEntryAction({
  onSave = async () => {
    return;
  },
  entry,
  viewDate,
}: {
  onSave: () => Promise<void>;
  entry: HarvestTimeEntry;
  viewDate: Date | null;
}) {
  return (
    <Action.Push
      target={<New onSave={onSave} entry={entry} viewDate={viewDate} />}
      title="Edit Time Entry"
      shortcut={{ key: "e", modifiers: ["cmd"] }}
      icon={Icon.Pencil}
    />
  );
}

function DuplicateEntryAction({
  onSave = async () => {
    return;
  },
  entry,
  viewDate,
}: {
  onSave: () => Promise<void>;
  entry: HarvestTimeEntry;
  viewDate: Date | null;
}) {
  return (
    <Action.Push
      target={<New onSave={onSave} viewDate={viewDate} entry={{ ...entry, id: null }} />}
      title="Duplicate Time Entry"
      shortcut={{ key: "d", modifiers: ["cmd"] }}
      icon={Icon.Clipboard}
    />
  );
}

function DeleteEntryAction({
  onComplete = async () => {
    return;
  },
  entry,
}: {
  onComplete: () => Promise<void>;
  entry: HarvestTimeEntry;
}) {
  return (
    <Action
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Delete Time Entry",
            message: "Are you sure? This cannot be undone",
            icon: Icon.Trash,
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          await deleteTimeEntry(entry);
          await onComplete();
        }
      }}
      title="Delete Time Entry"
      shortcut={{ key: "x", modifiers: ["ctrl"] }}
      icon={Icon.Trash}
    />
  );
}

function OpenHarvestAppAction() {
  const [app, setApp] = useState<Application>();
  const { data: company } = useCompany();

  async function init() {
    const installedApps = await getApplications();
    const filteredApps = installedApps.filter((app) => {
      return app.bundleId?.includes("com.getharvest.harvestxapp");
    });

    if (filteredApps.length) {
      setApp(filteredApps[0]);
    }
  }

  useEffect(() => {
    init();
  }, []);

  if (!app) {
    return (
      <Action.OpenInBrowser
        title="Open Harvest Website"
        shortcut={{ key: "o", modifiers: ["cmd"] }}
        icon={{ source: "./harvest-logo-icon.png" }}
        url={company ? `${company.base_uri}/time/week` : "https://www.getharvest.com"}
      />
    );
  }

  return (
    <Action
      onAction={() => {
        try {
          execSync(`open ${app.path}`);
        } catch {
          showToast(Toast.Style.Failure, "Could not Open Harvest App");
        }
      }}
      title="Open Harvest App"
      shortcut={{ key: "o", modifiers: ["cmd"] }}
      icon={{ source: "./harvest-logo-icon.png" }}
    />
  );
}
