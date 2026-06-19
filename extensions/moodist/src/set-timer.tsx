import { Action, ActionPanel, Form, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { checkTimer, clearTimer, formatDuration, setTimer } from "./lib/timer-manager";
import { TIMER_DURATIONS } from "./lib/constants";
import { useEffect, useState } from "react";

export default function SetTimerCommand() {
  const [currentTimer, setCurrentTimer] = useState<{
    active: boolean;
    remainingFormatted: string;
  }>({ active: false, remainingFormatted: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const info = await checkTimer();
      setCurrentTimer({ active: info.active && !info.expired, remainingFormatted: info.remainingFormatted });
      setIsLoading(false);
    })();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Set Sleep Timer"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Timer"
            icon={Icon.Clock}
            onSubmit={async (values: { duration: string; custom?: string }) => {
              let minutes: number;

              if (values.duration === "custom") {
                const parsed = parseInt(values.custom || "", 10);
                if (isNaN(parsed) || parsed <= 0) {
                  await showToast({ style: Toast.Style.Failure, title: "Enter a valid number of minutes" });
                  return;
                }
                minutes = parsed;
              } else {
                minutes = parseInt(values.duration, 10);
              }

              await setTimer(minutes);
              await showHUD(`Timer set for ${formatDuration(minutes)}`);
            }}
          />
          {currentTimer.active && (
            <Action
              title="Cancel Timer"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await clearTimer();
                await showHUD("Timer cancelled");
                setCurrentTimer({ active: false, remainingFormatted: "" });
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {currentTimer.active && (
        <Form.Description title="Current Timer" text={`${currentTimer.remainingFormatted} remaining`} />
      )}
      <Form.Dropdown id="duration" title="Duration" defaultValue="30">
        {TIMER_DURATIONS.map((d) => (
          <Form.Dropdown.Item key={d.value} value={String(d.value)} title={d.title} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom..." />
      </Form.Dropdown>
      <Form.TextField id="custom" title="Custom Minutes" placeholder="Enter minutes..." />
    </Form>
  );
}
