import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { CronJob } from "../types";
import { isValidCron, SCHEDULE_PRESETS, getNextRun } from "../utils/cronUtils";

interface CronFormProps {
  job?: CronJob;
  onSave: (job: CronJob) => void;
}

export default function CronForm({ job, onSave }: CronFormProps) {
  const { pop } = useNavigation();

  // Initial values
  const [name, setName] = useState(job?.name || "");
  const [schedule, setSchedule] = useState(job?.schedule || "* * * * *");
  const [command, setCommand] = useState(job?.command || "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [scheduleError, setScheduleError] = useState<string | undefined>();
  const [commandError, setCommandError] = useState<string | undefined>();

  const handleSubmit = () => {
    let hasError = false;

    if (!name.trim()) {
      setNameError("Name is required");
      hasError = true;
    } else if (name.includes("|") || name.includes("\n")) {
      setNameError("Name cannot contain pipe (|) or newlines");
      hasError = true;
    }

    if (!isValidCron(schedule)) {
      setScheduleError("Invalid cron expression");
      hasError = true;
    }

    if (!command.trim()) {
      setCommandError("Command is required");
      hasError = true;
    }

    if (hasError) return;

    const newJob: CronJob = {
      id: job?.id || Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      schedule,
      command: command.trim(),
      lastRun: job?.lastRun || null,
      nextRun: getNextRun(schedule),
      status: job?.status || "active",
      type: job?.type || "custom",
    };

    onSave(newJob);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={job ? "Update Job" : "Create Job"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Daily Backup"
        value={name}
        onChange={(val) => {
          setName(val);
          setNameError(undefined);
        }}
        error={nameError}
      />

      <Form.Dropdown
        id="preset"
        title="Schedule Preset"
        value={SCHEDULE_PRESETS.some((p) => p.value === schedule) ? schedule : "custom"}
        onChange={(newValue) => {
          if (newValue !== "custom") {
            setSchedule(newValue);
            setScheduleError(undefined);
          }
        }}
      >
        {SCHEDULE_PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset.value} value={preset.value} title={preset.label} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>

      <Form.TextField
        id="schedule"
        title="Cron Expression"
        placeholder="* * * * *"
        value={schedule}
        onChange={(val) => {
          setSchedule(val);
          if (isValidCron(val)) setScheduleError(undefined);
        }}
        error={scheduleError}
        info="Standard cron format: minute hour day(month) month day(week)"
      />

      <Form.TextField
        id="command"
        title="Command"
        placeholder="/bin/bash script.sh"
        value={command}
        onChange={(val) => {
          setCommand(val);
          setCommandError(undefined);
        }}
        error={commandError}
      />
    </Form>
  );
}
