import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getCurrentlyActiveTimeEntry, getElapsedTime, stopCurrentTimer, toMonospaceFont } from "./utils";
import { TimeEntry } from "./types";

// We have to use this as too many states changes seem to cancel the timer before 10 seconds (the min interval) elapsed
class DataWrapper {
  public currentEntry: TimeEntry | null = null;
  public currentlyElapsedTime: string | null = null;
}

export default function ClockifyMenuCommand(): JSX.Element {
  const [currentData, setCurrentData] = useState<DataWrapper | null>(null);

  const handleStopTimer = async () => {
    try {
      await stopCurrentTimer(() => setCurrentData(null));
    } catch (error) {
      showFailureToast(error, { title: "Could not stop timer" });
    }
  };

  useEffect(() => {
    const entry = getCurrentlyActiveTimeEntry();
    setCurrentData({
      currentEntry: entry,
      currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
    });

    if (entry) {
      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        // Trickery - else the component gets reset before the 10s interval is reached
        if (counter % 2 === 0) {
          const entry = getCurrentlyActiveTimeEntry();
          setCurrentData({
            currentEntry: entry,
            currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
          });
        } else {
          setCurrentData((prev) => ({
            currentEntry: prev?.currentEntry || null,
            currentlyElapsedTime: prev?.currentEntry ? getElapsedTime(prev.currentEntry) : null,
          }));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const currentEntry = currentData?.currentEntry;
  const currentlyElapsedTime = currentData?.currentlyElapsedTime;

  return (
    <MenuBarExtra
      title={currentlyElapsedTime ? toMonospaceFont(currentlyElapsedTime) : "No Timer"}
      icon={{ source: Icon.Clock, tintColor: currentEntry?.project?.color || Color.PrimaryText }}
      tooltip={
        currentEntry
          ? `${currentEntry.description || "No Description"} - ${currentEntry.project?.name || "No Project"}`
          : "No active timer"
      }
    >
      {currentEntry ? (
        <>
          <MenuBarExtra.Item
            title={currentEntry.description || "No Description"}
            icon={{ source: Icon.Dot, tintColor: currentEntry.project?.color }}
          />
          <MenuBarExtra.Item
            title={currentEntry.project?.name || "No Project"}
            icon={{ source: Icon.Dot, tintColor: currentEntry.project?.color }}
          />
          {currentEntry.task && (
            <MenuBarExtra.Item
              title={currentEntry.task.name}
              icon={{ source: Icon.Dot, tintColor: currentEntry.project?.color }}
            />
          )}
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title="Stop Timer" icon={Icon.Stop} onAction={handleStopTimer} />
          <MenuBarExtra.Item
            title="Open Clockify Website"
            icon={Icon.Globe}
            onAction={() => open("https://app.clockify.me")}
          />
        </>
      ) : (
        <MenuBarExtra.Item title="No active timer" icon={Icon.Clock} />
      )}
    </MenuBarExtra>
  );
}
