import { ActionPanel, Action, List, Icon, Color, Detail, showToast, Toast, confirmAlert } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { BabyBuddyAPI, Timer } from "./api";
import { calculateElapsedTime, formatErrorMessage, formatTimeWithTooltip } from "./utils";
import CreateTimerForm from "./components/CreateTimerForm";
import StopTimerForm from "./components/StopTimerForm";
import EditTimerForm from "./components/EditTimerForm";
import { showFailureToast } from "@raycast/utils";

interface TimerWithDetails extends Timer {
  childName: string;
  elapsedTime: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [timers, setTimers] = useState<TimerWithDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshTimers = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    async function fetchTimers() {
      try {
        setIsLoading(true);
        const api = new BabyBuddyAPI();
        const activeTimers = await api.getActiveTimers();

        const timersWithDetails = await Promise.all(
          activeTimers.map(async (timer) => {
            const childName = await api.getChildName(timer.child);
            const elapsedTime = calculateElapsedTime(timer.start);
            return { ...timer, childName, elapsedTime };
          }),
        );

        setTimers(timersWithDetails);
      } catch (e) {
        setError("Failed to fetch timers. Please check your Baby Buddy URL and API key.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimers();

    // Update elapsed time every second
    const intervalId = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => ({
          ...timer,
          elapsedTime: calculateElapsedTime(timer.start),
        })),
      );
    }, 1000);

    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search timers..."
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshTimers} />
          <Action.Push
            title="Create Timer"
            icon={Icon.Plus}
            target={<CreateTimerForm onTimerCreated={refreshTimers} />}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Active Timers" subtitle={`${timers.length} running`}>
        {timers.map((timer) => (
          <TimerListItem key={timer.id} timer={timer} onTimerStopped={refreshTimers} />
        ))}
      </List.Section>
      {timers.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.Clock, tintColor: Color.Purple }}
          title="No Active Timers"
          description="There are no active timers running in Baby Buddy."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Timer"
                icon={Icon.Plus}
                target={<CreateTimerForm onTimerCreated={refreshTimers} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function TimerListItem({ timer, onTimerStopped }: { timer: TimerWithDetails; onTimerStopped: () => void }) {
  const getTimerIcon = (timerName: string) => {
    if (!timerName) {
      return { source: Icon.Clock, tintColor: Color.Green };
    }

    const name = timerName.toLowerCase();
    if (name.includes("feed") || name.includes("nursing") || name.includes("bottle")) {
      return { source: Icon.Mug, tintColor: Color.Blue };
    } else if (name.includes("sleep") || name.includes("nap")) {
      return { source: Icon.Moon, tintColor: Color.Purple };
    } else if (name.includes("tummy") || name.includes("play")) {
      return { source: Icon.Star, tintColor: Color.Orange };
    } else if (name.includes("bath")) {
      return { source: Icon.Droplets, tintColor: Color.Blue };
    } else if (name.includes("pump")) {
      return { source: Icon.Droplets, tintColor: Color.PrimaryText };
    } else {
      return { source: Icon.Clock, tintColor: Color.Green };
    }
  };

  const handleDeleteTimer = async () => {
    // Show confirmation dialog before deleting
    const options = {
      title: "Delete Timer",
      message: `Are you sure you want to delete the "${timer.name || "Unnamed Timer"}" timer for ${timer.childName}?`,
      icon: Icon.Trash,
    };

    if (await confirmAlert(options)) {
      try {
        const api = new BabyBuddyAPI();
        await api.deleteTimer(timer.id);

        await showToast({
          style: Toast.Style.Success,
          title: "Timer Deleted",
          message: `${timer.name || "Unnamed Timer"} timer deleted`,
        });

        onTimerStopped(); // Refresh the timer list
      } catch (error) {
        await showFailureToast({
          title: "Failed to Delete Timer",
          message: "Failed to delete the timer: " + formatErrorMessage(error),
        });
      }
    }
  };

  const handleResetTimer = async () => {
    // Show confirmation dialog before resetting
    const options = {
      title: "Reset Timer",
      message: `Are you sure you want to reset the "${timer.name || "Unnamed Timer"}" timer for ${timer.childName}?`,
      icon: Icon.ArrowClockwise,
    };

    if (await confirmAlert(options)) {
      try {
        const api = new BabyBuddyAPI();
        await api.resetTimer(timer.id);

        await showToast({
          style: Toast.Style.Success,
          title: "Timer Reset",
          message: `${timer.name || "Unnamed Timer"} timer reset to current time`,
        });

        onTimerStopped(); // Refresh the timer list
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Reset Timer",
          message: "Please try again",
        });
      }
    }
  };

  return (
    <List.Item
      title={timer.name || "Unnamed Timer"}
      subtitle={
        timer.childName === "Deleted Child" || timer.childName === "Unknown Child"
          ? timer.childName
          : `For: ${timer.childName}`
      }
      accessories={[{ text: timer.elapsedTime, tooltip: formatTimeWithTooltip(timer.start).tooltip }]}
      icon={getTimerIcon(timer.name)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Timer"
            icon={Icon.Pencil}
            target={<EditTimerForm timer={timer} childName={timer.childName} onTimerUpdated={onTimerStopped} />}
          />
          <Action.Push
            title="Stop Timer"
            icon={Icon.Stop}
            target={
              <StopTimerForm
                timer={timer}
                childName={timer.childName}
                onTimerStopped={onTimerStopped}
                onTimerReset={onTimerStopped}
                onTimerDeleted={onTimerStopped}
              />
            }
          />
          <Action.Push
            title="Create Timer"
            icon={Icon.Plus}
            target={<CreateTimerForm onTimerCreated={onTimerStopped} />}
          />
          <Action title="Reset Timer" icon={Icon.ArrowClockwise} onAction={handleResetTimer} />
          <Action
            title="Delete Timer"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDeleteTimer}
          />
        </ActionPanel>
      }
    />
  );
}
