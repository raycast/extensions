import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { BabyBuddyAPI, Timer } from "../api";
import { formatErrorMessage } from "../utils/formatters";

interface StopTimerFormProps {
  timer: Timer;
  childName: string;
  onTimerStopped: () => void;
  onTimerReset: () => void;
  onTimerDeleted: () => void;
}

// Timer types for stopping a timer
const TIMER_TYPES = [
  { id: "feeding", name: "Feeding", keywords: ["feed", "nursing", "bottle", "breast", "formula", "milk", "eat"] },
  { id: "pumping", name: "Pumping", keywords: ["pump", "express"] },
  { id: "sleep", name: "Sleep", keywords: ["sleep", "nap", "bed", "rest"] },
  { id: "tummy-time", name: "Tummy Time", keywords: ["tummy", "belly", "stomach"] },
];

export default function StopTimerForm({
  timer,
  childName,
  onTimerStopped,
  onTimerReset,
  onTimerDeleted,
}: StopTimerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimerType, setSelectedTimerType] = useState<string>("");
  const [stopDateTime, setStopDateTime] = useState<Date>(new Date());
  const { push, pop } = useNavigation();

  // Determine the most likely timer type based on the timer name
  useEffect(() => {
    const timerNameLower = timer.name.toLowerCase();

    // Check each timer type for keyword matches
    let bestMatch = "";
    let bestMatchScore = 0;

    TIMER_TYPES.forEach((type) => {
      const matchScore = type.keywords.reduce((score, keyword) => {
        return timerNameLower.includes(keyword) ? score + 1 : score;
      }, 0);

      if (matchScore > bestMatchScore) {
        bestMatchScore = matchScore;
        bestMatch = type.id;
      }
    });

    // If we found a match, set it as the selected type
    if (bestMatch) {
      setSelectedTimerType(bestMatch);
    } else {
      // Default to the first option if no match
      setSelectedTimerType(TIMER_TYPES[0].id);
    }
  }, [timer.name]);

  async function handleSubmit(values: { timerType: string }) {
    try {
      setIsLoading(true);

      // Import the list components for navigation after creation
      const { default: FeedingList } = await import("./FeedingList");
      const { default: SleepList } = await import("./SleepList");
      const { default: TummyTimeList } = await import("./TummyTimeList");

      // Get the child object from the API
      const api = new BabyBuddyAPI();
      const children = await api.getChildren();
      const child = children.find((c) => c.id === timer.child);

      if (!child) {
        showToast({
          style: Toast.Style.Failure,
          title: "Child Not Found",
          message: "Could not find the child associated with this timer",
        });
        setIsLoading(false);
        return;
      }

      // Create a callback that will navigate to the appropriate list after creation
      const onEventCreated = () => {
        // First call the original callback to refresh the timer list
        onTimerStopped();

        // Then navigate to the appropriate list
        switch (values.timerType) {
          case "feeding":
            push(<FeedingList child={child} />);
            break;
          case "sleep":
            push(<SleepList child={child} />);
            break;
          case "tummy-time":
            push(<TummyTimeList child={child} />);
            break;
          default:
            // No specific navigation for pumping or other types
            pop();
        }
      };

      // Navigate to the appropriate form based on the timer type
      switch (values.timerType) {
        case "feeding": {
          // We'll import the component dynamically to avoid circular dependencies
          const { default: CreateFeedingForm } = await import("./CreateFeedingForm");
          push(
            <CreateFeedingForm
              timer={{ ...timer, end: stopDateTime.toISOString() }}
              childName={childName}
              onEventCreated={onEventCreated}
            />,
          );
          break;
        }
        case "pumping": {
          const { default: CreatePumpingForm } = await import("./CreatePumpingForm");
          push(
            <CreatePumpingForm
              timer={{ ...timer, end: stopDateTime.toISOString() }}
              childName={childName}
              onEventCreated={onTimerStopped}
            />,
          );
          break;
        }
        case "sleep": {
          const { default: CreateSleepForm } = await import("./CreateSleepForm");
          push(
            <CreateSleepForm
              timer={{ ...timer, end: stopDateTime.toISOString() }}
              childName={childName}
              onEventCreated={onEventCreated}
            />,
          );
          break;
        }
        case "tummy-time": {
          const { default: CreateTummyTimeForm } = await import("./CreateTummyTimeForm");
          push(
            <CreateTummyTimeForm
              timer={{ ...timer, end: stopDateTime.toISOString() }}
              childName={childName}
              onEventCreated={onEventCreated}
            />,
          );
          break;
        }
        default: {
          // If no specific event type is selected, just delete the timer
          const api = new BabyBuddyAPI();
          await api.deleteTimer(timer.id);

          await showToast({
            style: Toast.Style.Success,
            title: "Timer Deleted",
            message: `${timer.name} timer deleted`,
          });

          onTimerDeleted();
          pop();
        }
      }
    } catch (error) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Process Timer",
        message: formatErrorMessage(error),
      });
    }
  }

  async function handleDelete() {
    // Show confirmation dialog before deleting
    const options = {
      title: "Delete Timer",
      message: `Are you sure you want to delete the "${timer.name}" timer for ${childName}?`,
      icon: Icon.Trash,
    };

    if (await confirmAlert(options)) {
      try {
        setIsLoading(true);
        const api = new BabyBuddyAPI();
        await api.deleteTimer(timer.id);

        await showToast({
          style: Toast.Style.Success,
          title: "Timer Deleted",
          message: `${timer.name} timer deleted`,
        });

        onTimerDeleted();
        pop();
      } catch (error) {
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Timer",
          message: formatErrorMessage(error),
        });
      }
    }
  }

  async function handleReset() {
    // Show confirmation dialog before resetting
    const options = {
      title: "Reset Timer",
      message: `Are you sure you want to reset the "${timer.name}" timer for ${childName}?`,
      icon: Icon.ArrowClockwise,
    };

    if (await confirmAlert(options)) {
      try {
        setIsLoading(true);
        const api = new BabyBuddyAPI();
        await api.resetTimer(timer.id);

        await showToast({
          style: Toast.Style.Success,
          title: "Timer Reset",
          message: `${timer.name} timer reset`,
        });

        onTimerReset();
        pop();
      } catch (error) {
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Reset Timer",
          message: formatErrorMessage(error),
        });
      }
    }
  }

  // Validate that the stop time is after the start time
  const isTimeRangeValid = stopDateTime > new Date(timer.start);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" onSubmit={handleSubmit} />
          <Action title="Delete Timer" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleDelete} />
          <Action title="Reset Timer" icon={Icon.ArrowClockwise} onAction={handleReset} />
        </ActionPanel>
      }
    >
      <Form.Description title="End Timer" text={`What type of activity was "${timer.name}" for ${childName}?`} />

      <Form.Dropdown id="timerType" title="Activity Type" value={selectedTimerType} onChange={setSelectedTimerType}>
        {TIMER_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="stopDateTime"
        title="Stop Time"
        value={stopDateTime}
        onChange={(newValue) => newValue && setStopDateTime(newValue)}
      />

      {!isTimeRangeValid && <Form.Description title="Error" text="⚠️ Stop time must be after the start time" />}
    </Form>
  );
}
