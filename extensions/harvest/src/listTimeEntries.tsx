// This fix is to prevent `TypeError: window.requestAnimationFrame is not a function` error from SWR
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window = {};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window.requestAnimationFrame = setTimeout;

import {
  ActionPanel,
  ActionPanelItem,
  ActionPanelSection,
  AlertActionStyle,
  Application,
  Color,
  confirmAlert,
  getApplications,
  getPreferenceValues,
  Icon,
  List,
  ListItem,
  OpenInBrowserAction,
  PushAction,
  showToast,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  deleteTimeEntry,
  getMyTimeEntries,
  newTimeEntry,
  restartTimer,
  stopTimer,
  useCompany,
} from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";
import New from "./new";
import { execSync } from "child_process";
import { NewTimeEntryDuration, NewTimeEntryStartEnd } from "./services/requestTypes";
import _ from "lodash";

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
  const [items, setItems] = useState<HarvestTimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [navigationTitle, setNavigationTitle] = useState("Today's Timesheet");
  const [navSubtitle, setNavSubtitle] = useState("");
  const { data: company } = useCompany();

  async function init(date?: Date) {
    if (!date) date = viewDate;
    let timeEntries: HarvestTimeEntry[] = [];

    try {
      timeEntries = await getMyTimeEntries({ from: date, to: date });
    } catch (error: any) {
      if (error.isAxiosError) {
        if (error.response?.status === 401) {
          await showToast(
            ToastStyle.Failure,
            "Invalid Token",
            "Your API token or Account ID is invalid. Go to Raycast Preferences to update it."
          );
        } else {
          await showToast(ToastStyle.Failure, "Unknown Error", "Could not fetch time entries");
        }
      } else {
        await showToast(ToastStyle.Failure, "Unknown Error", "Could not fetch time entries");
      }
    }

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

    setItems(timeEntries);

    const dayTotal = _.sumBy(timeEntries, "hours")?.toFixed(2) ?? "";
    if (company?.time_format === "hours_minutes") {
      const time = dayTotal.split(".");
      const hour = time[0];
      const minute = parseFloat(`0.${time[1]}`) * 60;
      setNavSubtitle(`${hour}:${minute < 10 ? "0" : ""}${minute.toFixed(0)}`);
    } else {
      setNavSubtitle(dayTotal);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  async function changeViewDate(date: Date) {
    // const relative = dayjs(date).fromNow();
    setNavSubtitle("");
    setItems([]);
    setIsLoading(true);
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
    await init(date);
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
      const toast = new Toast({ style: ToastStyle.Animated, title: "Loading..." });
      await toast.show();
      try {
        if (entry.is_running) {
          await stopTimer(entry);
        } else {
          await restartTimer(entry);
        }
        await toast.hide();
      } catch {
        await showToast(ToastStyle.Failure, "Error", `Could not ${entry.is_running ? "stop" : "start"} your timer`);
      }
      await onComplete();
    }

    return dayjs(viewDate).isToday() ? (
      <ActionPanelItem
        title={entry.is_running ? "Stop Timer" : "Start Timer"}
        icon={Icon.Clock}
        onAction={startOrStopTimer}
      />
    ) : (
      <>
        <ActionPanelItem
          title="Start on Today"
          icon={Icon.Calendar}
          onAction={async () => {
            // make sure no other timer is running
            await stopTimer();

            param.spent_date = dayjs().format("YYYY-MM-DD");
            await newTimeEntry(param);
            await changeViewDate(new Date());
          }}
        />
        <ActionPanelItem
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
        <ActionPanelItem
          title="Previous Day"
          icon={{ source: "./arrow.left@2x.png" }}
          shortcut={{ key: "arrowLeft", modifiers: ["cmd"] }}
          onAction={() => {
            changeViewDate(dayjs(viewDate).subtract(1, "d").toDate());
          }}
        />
        <ActionPanelItem
          title="Next Day"
          icon={{ source: "./arrow.right@2x.png" }}
          shortcut={{ key: "arrowRight", modifiers: ["cmd"] }}
          onAction={() => {
            changeViewDate(dayjs(viewDate).add(1, "d").toDate());
          }}
        />
        {!dayjs(viewDate).isToday() && (
          <ActionPanelItem
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

  return (
    <List
      searchBarPlaceholder="Filter Time Entries"
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <ActionPanelSection title="Harvest">
            <NewEntryAction onSave={init} viewDate={viewDate} />
            <OpenHarvestAppAction />
          </ActionPanelSection>
          <ActionPanelSection title="Change Dates">
            <SwitchViewDateActions />
          </ActionPanelSection>
        </ActionPanel>
      }
    >
      <List.Section title={`${navigationTitle}`} subtitle={navSubtitle}>
        {items.map((entry) => {
          return (
            <ListItem
              id={entry.id.toString()}
              key={entry.id}
              title={entry.project.name}
              accessoryTitle={`${entry.client.name}${entry.client.name && entry.task.name ? " | " : ""}${
                entry.task.name
              } | ${entry.hours}`}
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
                  <ActionPanelSection title={`${entry.project.name} | ${entry.client.name}`}>
                    <ToggleTimerAction onComplete={init} entry={entry} />
                    {/* Disabling Edit Action for now so we can ship something a useable extension faster */}
                    {/* <EditEntryAction onSave={init} entry={entry} /> */}
                    <DeleteEntryAction onComplete={init} entry={entry} />
                  </ActionPanelSection>
                  <ActionPanelSection title="Harvest">
                    <NewEntryAction onSave={init} viewDate={viewDate} />
                    <OpenHarvestAppAction />
                  </ActionPanelSection>
                  <ActionPanelSection title="Change Dates">
                    <SwitchViewDateActions />
                  </ActionPanelSection>
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
  viewDate: Date;
}) {
  return (
    <PushAction
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
  viewDate: Date;
}) {
  return (
    <PushAction
      target={<New onSave={onSave} entry={entry} viewDate={viewDate} />}
      title="Edit Time Entry"
      shortcut={{ key: "e", modifiers: ["cmd"] }}
      icon={Icon.Pencil}
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
    <ActionPanelItem
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Delete Time Entry",
            message: "Are you sure? This cannot be undone",
            icon: Icon.Trash,
            primaryAction: {
              title: "Delete",
              style: AlertActionStyle.Destructive,
            },
          })
        ) {
          await deleteTimeEntry(entry);
          await onComplete();
        }
      }}
      title="Delete Time Entry"
      shortcut={{ key: "delete", modifiers: ["cmd"] }}
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
      <OpenInBrowserAction
        title="Open Harvest Website"
        shortcut={{ key: "o", modifiers: ["cmd"] }}
        icon={{ source: "./harvest-logo-icon.png" }}
        url={company ? `${company.base_uri}/time/week` : "https://www.getharvest.com"}
      />
    );
  }

  return (
    <ActionPanelItem
      onAction={() => {
        try {
          execSync(`open ${app.path}`);
        } catch {
          showToast(ToastStyle.Failure, "Could not Open Harvest App");
        }
      }}
      title="Open Harvest App"
      shortcut={{ key: "o", modifiers: ["cmd"] }}
      icon={{ source: "./harvest-logo-icon.png" }}
    />
  );
}
