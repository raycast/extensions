import { MenuBarExtra, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getActiveTimer, getProjectById, stopActiveTimer } from "./storage";
import { TimeEntry, Project } from "./models";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [project, setProject] = useState<Project | undefined>();
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const updateTimer = async () => {
      try {
        const timer = await getActiveTimer();
        setActiveTimer(timer);

        if (timer?.projectId) {
          const proj = await getProjectById(timer.projectId);
          setProject(proj);
        }

        if (timer?.startTime) {
          const duration = Date.now() - new Date(timer.startTime).getTime();
          const hours = Math.floor(duration / (1000 * 60 * 60));
          const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
          setElapsedTime(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);

          // Only set up the interval if we have an active timer
          if (!interval) {
            interval = setInterval(updateTimer, 60000);
          }
        } else {
          // No active timer, clear the interval if it exists
          if (interval) {
            clearInterval(interval);
            interval = undefined;
          }
        }
      } catch (error) {
        showFailureToast(error, { title: "Error updating timer" });
      } finally {
        setIsLoading(false);
      }
    };

    // Initial update
    updateTimer();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Function to handle stopping the timer directly from menubar
  const handleStopTimer = async () => {
    try {
      if (!activeTimer) return;

      // Get the timer info before stopping it
      const timerInfo = `${project?.name ? project.name + " — " : ""}${activeTimer.description || "Untitled"} timer stopped`;

      // Stop the timer
      const stoppedTimer = await stopActiveTimer();

      if (stoppedTimer) {
        // Show HUD notification
        await showHUD(timerInfo);
      } else {
        // Timer was discarded (less than 1 minute)
        await showHUD("Discarded! Entries shorter than 1 min are removed");
      }

      // Update the menubar (it will hide since there's no active timer)
      setActiveTimer(null);
    } catch (error) {
      showFailureToast(error, { title: "Error stopping timer" });
    }
  };

  // Ensure we have the project text for display
  const projectText = project?.name;
  const projectName = projectText || "Unassigned";
  const title = isLoading
    ? "Loading..."
    : activeTimer
      ? `${projectName} — ${activeTimer.description || "No Description"} · ${elapsedTime}`
      : "";

  // Don't render anything if there's no active timer
  if (!isLoading && !activeTimer) {
    return null;
  }

  return (
    <MenuBarExtra title={title} tooltip="Active Timer" isLoading={isLoading}>
      {!isLoading && activeTimer && (
        <>
          <MenuBarExtra.Item title="Stop Timer" onAction={handleStopTimer} />
        </>
      )}
    </MenuBarExtra>
  );
}
