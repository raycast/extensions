import { Action, ActionPanel, Form, Icon, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { cactusAppPath, CactusStatus, configure, readStatus } from "./cactus";

const weekdays = [
  [2, "Monday"],
  [3, "Tuesday"],
  [4, "Wednesday"],
  [5, "Thursday"],
  [6, "Friday"],
  [7, "Saturday"],
  [1, "Sunday"],
] as const;

interface Values {
  activeWeekdays: string[];
  focusStart: string;
  accessStart: string;
  domains: string;
}

// The app edits times in 15-minute steps; a value set elsewhere at another minute stays selectable.
function timeSlots(...current: (number | undefined)[]): number[] {
  const slots = new Set(Array.from({ length: 96 }, (_, index) => index * 15));
  for (const value of current) if (value !== undefined) slots.add(value);
  return [...slots].sort((a, b) => a - b);
}

export default function ScheduleForm({ initialStatus }: { initialStatus?: CactusStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status) return;
    readStatus()
      .then(setStatus)
      .catch((value: unknown) => setError(message(value)));
  }, [status, attempt]);

  async function submit(values: Values) {
    const domains = values.domains
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    const activeWeekdays = values.activeWeekdays.map(Number);
    const focusStartMinutes = values.focusStart ? Number(values.focusStart) : undefined;
    const accessStartMinutes = values.accessStart ? Number(values.accessStart) : undefined;
    if (
      focusStartMinutes === undefined ||
      accessStartMinutes === undefined ||
      domains.length === 0 ||
      activeWeekdays.length === 0 ||
      focusStartMinutes === accessStartMinutes
    ) {
      await showToast(
        Toast.Style.Failure,
        "Check the schedule",
        "Choose a site and day, with different start and end times.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const result = await configure({ domains, activeWeekdays, focusStartMinutes, accessStartMinutes });
      await showToast({
        style: Toast.Style.Success,
        title: "Next schedule saved",
        message: result.pendingChangesApplyAt ? "Your current block stays unchanged." : undefined,
      });
      await popToRoot({ clearSearchBar: true });
    } catch (value) {
      await showToast(Toast.Style.Failure, "Cactus could not save the schedule", message(value));
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return (
      <Form
        isLoading={false}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setError(undefined);
                setAttempt((value) => value + 1);
              }}
            />
            <Action title="Open Cactus" icon={Icon.AppWindow} onAction={async () => open(await cactusAppPath())} />
            <Action.OpenInBrowser title="Download Cactus" url="https://usecactus.app" />
          </ActionPanel>
        }
      >
        <Form.Description title="Cactus" text={error} />
      </Form>
    );
  }

  if (!status) {
    return <Form isLoading />;
  }

  const configuration = status.configuration;
  const focusStart = configuration?.focusStartMinutes ?? 4 * 60;
  const accessStart = configuration?.accessStartMinutes ?? 20 * 60;
  const slots = timeSlots(focusStart, accessStart);
  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Next Schedule" icon={Icon.Check} onSubmit={submit} />
          <Action title="Open Cactus" icon={Icon.AppWindow} onAction={async () => open(await cactusAppPath())} />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="activeWeekdays"
        title="Days"
        defaultValue={(configuration?.activeWeekdays ?? weekdays.map(([value]) => value)).map(String)}
      >
        {weekdays.map(([value, title]) => (
          <Form.TagPicker.Item key={value} value={String(value)} title={title} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="focusStart" title="Protection Starts" defaultValue={String(focusStart)}>
        {slots.map((value) => (
          <Form.Dropdown.Item key={value} value={String(value)} title={clockTime(value)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="accessStart" title="Access Returns" defaultValue={String(accessStart)}>
        {slots.map((value) => (
          <Form.Dropdown.Item key={value} value={String(value)} title={clockTime(value)} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="domains"
        title="Websites"
        placeholder="One website per line"
        defaultValue={(configuration?.domains ?? ["youtube.com"]).join("\n")}
      />
      {status.isProtected ? <Form.Description text="Changes apply to the next scheduled block." /> : null}
    </Form>
  );
}

function clockTime(value: number): string {
  const date = new Date();
  date.setHours(Math.floor(value / 60), value % 60, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function message(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}
