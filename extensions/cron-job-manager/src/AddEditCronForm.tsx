import {
  Form,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  CronJob,
  addCronJob,
  editCronJob,
  getNextRunTimes,
  validateCronField,
} from "./cron-utils";
import cronstrue from "cronstrue";

interface Props {
  job?: CronJob; // if provided → edit mode
  onSave: () => void;
}

const PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at 9 AM", value: "0 9 * * *" },
  { label: "Every weekday at 9 AM", value: "0 9 * * 1-5" },
  { label: "Every Monday at 8 AM", value: "0 8 * * 1" },
  { label: "Every Sunday at midnight", value: "0 0 * * 0" },
  { label: "Every week (Sunday midnight)", value: "@weekly" },
  { label: "Every month (1st at midnight)", value: "@monthly" },
  { label: "Every year (Jan 1 midnight)", value: "@yearly" },
  { label: "At reboot", value: "@reboot" },
  { label: "Custom…", value: "__custom__" },
];

export function AddEditCronForm({ job, onSave }: Props) {
  const { pop } = useNavigation();
  const isEdit = !!job;

  const [schedule, setSchedule] = useState(job?.schedule ?? "");
  const [command, setCommand] = useState(job?.command ?? "");
  const [comment, setComment] = useState(job?.comment ?? "");
  const [preset, setPreset] = useState<string>(
    job
      ? (PRESETS.find((p) => p.value === job.schedule)?.value ?? "__custom__")
      : "* * * * *",
  );
  const [scheduleError, setScheduleError] = useState<string | undefined>();
  const [commandError, setCommandError] = useState<string | undefined>();

  // Preview state
  const [humanReadable, setHumanReadable] = useState("");
  const [nextRuns, setNextRuns] = useState<Date[]>([]);

  useEffect(() => {
    if (!schedule) {
      setHumanReadable("");
      setNextRuns([]);
      return;
    }
    try {
      setHumanReadable(
        cronstrue.toString(schedule, { throwExceptionOnParseError: true }),
      );
      setNextRuns(getNextRunTimes(schedule, 5));
    } catch {
      setHumanReadable("Invalid expression");
      setNextRuns([]);
    }
  }, [schedule]);

  function handlePresetChange(val: string) {
    setPreset(val);
    if (val !== "__custom__") {
      setSchedule(val);
      setScheduleError(undefined);
    }
  }

  async function handleSubmit() {
    // Validate
    const schErr = validateCronField(schedule);
    const cmdErr = command.trim() ? undefined : "Command is required";
    setScheduleError(schErr);
    setCommandError(cmdErr);
    if (schErr || cmdErr) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isEdit ? "Saving changes…" : "Adding cron job…",
    });

    try {
      if (isEdit && job) {
        await editCronJob(job, {
          schedule: schedule.trim(),
          command: command.trim(),
          comment: comment.trim() || undefined,
        });
      } else {
        await addCronJob({
          schedule: schedule.trim(),
          command: command.trim(),
          comment: comment.trim() || undefined,
        });
      }

      toast.style = Toast.Style.Success;
      toast.title = isEdit ? "Cron job updated" : "Cron job added";
      onSave();
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save";
      toast.message = String(err);
    }
  }

  const isCustom =
    preset === "__custom__" || !PRESETS.find((p) => p.value === schedule);

  return (
    <Form
      navigationTitle={isEdit ? "Edit Cron Job" : "Add Cron Job"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Changes" : "Add Cron Job"}
            icon={isEdit ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action title="Cancel" icon={Icon.XmarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      {/* Label */}
      <Form.TextField
        id="comment"
        title="Label (optional)"
        placeholder="e.g. Daily backup, Cleanup logs…"
        value={comment}
        onChange={setComment}
        info="A friendly name shown in the list — stored as a # comment on the crontab line"
      />

      <Form.Separator />

      {/* Schedule preset picker */}
      <Form.Dropdown
        id="preset"
        title="Schedule Preset"
        value={preset}
        onChange={handlePresetChange}
        info="Pick a preset or choose Custom to enter a cron expression manually"
      >
        {PRESETS.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.label} />
        ))}
      </Form.Dropdown>

      {/* Custom expression field */}
      {(isCustom || preset === "__custom__") && (
        <Form.TextField
          id="schedule"
          title="Cron Expression"
          placeholder="*/5 * * * *"
          value={schedule}
          onChange={(v) => {
            setSchedule(v);
            setScheduleError(validateCronField(v));
          }}
          error={scheduleError}
          info={
            "Standard 5-field cron: minute hour day-of-month month day-of-week\n" +
            "Examples:\n  */5 * * * *  → every 5 min\n  0 9 * * 1-5 → weekdays at 9 AM\n  @reboot → at startup"
          }
        />
      )}

      {/* Human readable preview */}
      {schedule && humanReadable && (
        <Form.Description title="Runs" text={humanReadable} />
      )}

      {/* Next run preview */}
      {nextRuns.length > 0 && (
        <Form.Description
          title="Next 5 runs"
          text={nextRuns
            .map((d) =>
              d.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            )
            .join("\n")}
        />
      )}

      <Form.Separator />

      {/* Command */}
      <Form.TextArea
        id="command"
        title="Command"
        placeholder="/usr/local/bin/python3 /path/to/script.py >> /tmp/out.log 2>&1"
        value={command}
        onChange={(v) => {
          setCommand(v);
          setCommandError(v.trim() ? undefined : "Command is required");
        }}
        error={commandError}
        info="The shell command to run. Use full paths for binaries. Redirect output with >> /path/to/file.log 2>&1 to capture logs."
        enableMarkdown={false}
      />

      <Form.Separator />

      {/* Tips */}
      <Form.Description
        title="Tips"
        text={
          "• Use full paths: /usr/local/bin/node instead of node\n" +
          "• Redirect output: command >> ~/cron.log 2>&1\n" +
          "• Test your command in Terminal first\n" +
          "• crontab doesn't load your shell's PATH automatically"
        }
      />
    </Form>
  );
}
