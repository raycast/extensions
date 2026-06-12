import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getCaffeinateState,
  startCaffeinate,
  stopCaffeinate,
  CaffeinateState,
} from "./utils";

export default function Command() {
  const [state, setState] = useState<CaffeinateState>({ active: false });
  const [isLoading, setIsLoading] = useState(true);
  const { push, pop } = useNavigation();

  async function loadState() {
    setIsLoading(true);
    try {
      const s = await getCaffeinateState();
      setState(s);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load state",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadState();
  }, []);

  // Set up an interval to refresh the remaining time if active and in duration mode
  useEffect(() => {
    if (!state.active || state.mode !== "duration") return;
    const interval = setInterval(async () => {
      const s = await getCaffeinateState();
      setState(s);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.active, state.mode]);

  async function handleStop() {
    setIsLoading(true);
    try {
      await stopCaffeinate();
      await showHUD("Caffeination stopped");
      await loadState();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  async function handleStart(minutes: number | "indefinite") {
    setIsLoading(true);
    try {
      if (minutes === "indefinite") {
        await startCaffeinate("indefinite");
        await showHUD("Caffeination started");
      } else {
        const seconds = minutes * 60;
        await startCaffeinate("duration", seconds);
        await showHUD(`Caffeination started for ${minutes} minutes`);
      }
      await loadState();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  function formatRemaining(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  function CustomDurationForm() {
    const [minutes, setMinutes] = useState("");
    const [error, setError] = useState<string | undefined>();

    async function handleSubmit() {
      const parsed = parseInt(minutes, 10);
      if (isNaN(parsed) || parsed <= 0) {
        setError("Please enter a positive number");
        return;
      }
      pop(); // Go back to main list
      await handleStart(parsed);
    }

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Start Caffeinating"
              onSubmit={handleSubmit}
              icon={Icon.Play}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="minutes"
          title="Duration (minutes)"
          placeholder="e.g. 45"
          value={minutes}
          onChange={(val) => {
            setMinutes(val);
            setError(undefined);
          }}
          error={error}
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search durations...">
      {state.active && (
        <List.Section title="Current Status">
          <List.Item
            title={
              state.mode === "indefinite"
                ? "Active: Caffeinated Indefinitely"
                : state.mode === "duration"
                  ? `Active: Caffeinated for ${Math.round(parseInt(state.value || "0") / 60)} minutes`
                  : `Active: Caffeinated while process '${state.value}' is running`
            }
            subtitle={
              state.remainingSeconds !== undefined
                ? `Time remaining: ${formatRemaining(state.remainingSeconds)}`
                : undefined
            }
            icon={Icon.MugSteam}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Caffeination"
                  onAction={handleStop}
                  icon={Icon.Stop}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Select Duration">
        <List.Item
          title="Indefinitely"
          subtitle="Keep PC awake until stopped manually"
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title="Caffeinate Indefinitely"
                onAction={() => handleStart("indefinite")}
                icon={Icon.Play}
              />
            </ActionPanel>
          }
        />
        {[5, 10, 15, 30, 45, 60, 120, 300].map((mins) => {
          const hours = mins >= 60 ? Math.floor(mins / 60) : 0;
          const remainingMins = mins % 60;
          const label =
            hours > 0
              ? `${hours} Hour${hours > 1 ? "s" : ""}${remainingMins > 0 ? ` ${remainingMins} Min` : ""}`
              : `${mins} Minutes`;

          return (
            <List.Item
              key={mins}
              title={label}
              subtitle={`Keep PC awake for ${mins} minute${mins > 1 ? "s" : ""}`}
              icon={Icon.Hourglass}
              actions={
                <ActionPanel>
                  <Action
                    title={`Caffeinate for ${label}`}
                    onAction={() => handleStart(mins)}
                    icon={Icon.Play}
                  />
                </ActionPanel>
              }
            />
          );
        })}
        <List.Item
          title="Custom Duration..."
          subtitle="Enter a custom duration in minutes"
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action
                title="Set Custom Duration"
                onAction={() => push(<CustomDurationForm />)}
                icon={Icon.Play}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
