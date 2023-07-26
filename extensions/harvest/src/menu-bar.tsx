import React from "react";
import { Cache, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { formatHours, stopTimer, useCompany, useMyTimeEntries } from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";

const cache = new Cache();

export function getCurrentTimerFromCache() {
  const running = cache.get("running");
  if (!running) return;
  return JSON.parse(running) as HarvestTimeEntry;
}

export default function MenuBar() {
  const { data, isLoading, revalidate } = useMyTimeEntries();
  const [cacheLoading, setCacheLoading] = React.useState(true);
  const { data: company, isLoading: companyLoading } = useCompany();

  const runningTimer = getCurrentTimerFromCache();
  const {
    callbackURLStart,
    callbackURLStop,
    showTimerInMenuBar = true,
  } = getPreferenceValues<{
    callbackURLStart?: string;
    callbackURLStop?: string;
    showTimerInMenuBar?: boolean;
  }>();

  React.useEffect(() => {
    if (data && !isLoading) {
      const found = data.find((o) => o.is_running);
      if (runningTimer?.id !== found?.id) {
        if (found && callbackURLStart) open(callbackURLStart);
        if (!found && callbackURLStop) open(callbackURLStop);
      }
      if (found) {
        cache.set("running", JSON.stringify(found));
      } else {
        cache.remove("running");
      }
      setCacheLoading(false);
    }
  }, [data, isLoading]);

  if (!runningTimer)
    return (
      <MenuBarExtra
        icon={{ source: runningTimer ? "../assets/harvest-logo-icon.png" : "../assets/harvest-logo-icon-gray.png" }}
        isLoading={isLoading || cacheLoading}
      >
        <MenuBarExtra.Item title="No Timer Running" />
        <MenuBarExtra.Item
          title="View Timesheet"
          onAction={() => {
            launchCommand({ extensionName: "harvest", name: "listTimeEntries", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra>
    );

  return (
    <MenuBarExtra
      icon={{ source: "../assets/harvest-logo-icon.png" }}
      title={showTimerInMenuBar ? formatHours(runningTimer.hours.toString(), company) : undefined}
      isLoading={isLoading || cacheLoading || companyLoading}
    >
      <MenuBarExtra.Item title={`${runningTimer.project.name} - ${runningTimer.task.name}`} />
      {runningTimer.notes && runningTimer.notes.length > 0 && <MenuBarExtra.Item title={`${runningTimer.notes}`} />}

      <MenuBarExtra.Item
        title="View Timesheet"
        onAction={() => {
          launchCommand({ extensionName: "harvest", name: "listTimeEntries", type: LaunchType.UserInitiated });
        }}
      />

      {/* <MenuBarExtra.Item
        title="Stop Timer"
        onAction={async () => {
          setCacheLoading(true);
          console.log("stopping timer...");
          await stopTimer(runningTimer);
          revalidate();
          setCacheLoading(false);
        }}
      /> */}
    </MenuBarExtra>
  );
}
