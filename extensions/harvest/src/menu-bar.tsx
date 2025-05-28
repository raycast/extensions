import { useEffect, useState } from "react";
import { LaunchType, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { formatHours, stopTimer, useCompany, useMyTimeEntries } from "./services/harvest";
import { HarvestTimeEntry } from "./services/responseTypes";
import { writeFileSync, rmSync, existsSync, mkdirSync } from "fs";

export default function MenuBar() {
  const { data, isLoading: dataLoading, mutate, revalidate } = useMyTimeEntries(null);
  const { data: company, isLoading: companyLoading } = useCompany();
  const [cacheLoading, setCacheLoading] = useState(false);

  const runningTimer = data.find((o) => o.is_running);

  const { showTimerInMenuBar = true } = getPreferenceValues<{
    showTimerInMenuBar?: boolean;
    statusFolder?: string;
  }>();

  const isLoading = dataLoading || cacheLoading;

  useEffect(() => {
    setStatusFile(runningTimer ?? null);
  }, [runningTimer]);

  if (!runningTimer)
    return (
      <MenuBarExtra
        icon={{ source: runningTimer ? "../assets/harvest-logo-icon.png" : "../assets/harvest-logo-icon-gray.png" }}
        isLoading={isLoading}
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
      isLoading={isLoading || companyLoading}
    >
      <MenuBarExtra.Item title={`${runningTimer.project.name} - ${runningTimer.task.name}`} />
      {runningTimer.notes && runningTimer.notes.length > 0 && <MenuBarExtra.Item title={`${runningTimer.notes}`} />}

      <MenuBarExtra.Item
        title="View Timesheet"
        onAction={() => {
          launchCommand({ extensionName: "harvest", name: "listTimeEntries", type: LaunchType.UserInitiated });
        }}
      />
      {runningTimer && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Stop Timer"
            onAction={async () => {
              await launchCommand({ extensionName: "harvest", name: "stopTimer", type: LaunchType.UserInitiated });
            }}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}

function setStatusFile(timeEntry: HarvestTimeEntry | null) {
  const { statusFolder } = getPreferenceValues<{ statusFolder?: string }>();
  if (!statusFolder) return;
  if (!existsSync(statusFolder)) mkdirSync(statusFolder);
  const statusFile = `${statusFolder}/currentTimer.json`;

  if (timeEntry) {
    writeFileSync(statusFile, JSON.stringify(timeEntry));
  } else {
    if (existsSync(statusFile)) rmSync(statusFile);
  }
}
