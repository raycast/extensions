import { ActionPanel, Action, Form, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ScheduledCommand, RaycastCommand, FormValues, ScheduleType } from "./types";
import { toLocalYMD } from "./utils/dateTime";
import { useCommandPermissions } from "./hooks/useCommandPermissions";
import CronExpressionParser from "cron-parser";
import {
  getScheduleDescription,
  parseRaycastDeeplink,
  getCommandDisplayName,
  processFormValues,
  createRaycastCommand,
  createSavedSchedule,
  buildScheduleFromValues,
} from "./utils";
import { ERROR_MESSAGES } from "./utils/constants";

interface CommandFormProps {
  command?: ScheduledCommand;
  onSave: (command: ScheduledCommand) => Promise<void>;
  title: string;
  submitButtonTitle: string;
  draftValues?: Partial<FormValues>;
}

const PERMISSION_MESSAGES = {
  REQUIRED: {
    title: "⚠️ Permission Required",
    text: `This command hasn't been tested yet. Use "Test Command Now" (⌘T) to verify it has proper permissions. When prompted, select "Always Allow" so the command can run when you're not present.`,
  },
  VERIFIED: {
    title: "✅ Command Verified",
    getText: (date: string) => `Last tested successfully on ${new Date(date).toLocaleDateString()}.`,
  },
} as const;

const showError = async (message: string, title = "Error") => {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
};

const showSuccess = async (title: string, message: string) => {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
};

export function CommandForm({ command, onSave, title, submitButtonTitle, draftValues }: CommandFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingCommand, setIsTestingCommand] = useState(false);
  const { getCommandPermission, testCommandPermission } = useCommandPermissions();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      command: (draftValues?.command as string) ?? (command ? command.command.deeplink : ""),
      name: (draftValues?.name as string) ?? (command?.name || ""),
      runInBackground: (draftValues?.runInBackground as boolean | undefined) ?? command?.command.type === "background",
      scheduleType: (draftValues?.scheduleType as ScheduleType) ?? (command?.schedule.type || "daily"),
      time: (draftValues?.time as string) ?? (command?.schedule.time || "09:00"),
      date: (draftValues?.date as string) ?? (command?.schedule.date || ""),
      dayOfWeek: (draftValues?.dayOfWeek as string) ?? command?.schedule.dayOfWeek?.toString(),
      dayOfMonth: (draftValues?.dayOfMonth as string) ?? command?.schedule.dayOfMonth?.toString(),
      cronExpression: (draftValues?.cronExpression as string) ?? (command?.schedule.cronExpression || ""),
    },
    async onSubmit(values) {
      setIsSubmitting(true);
      try {
        const processedValues = processFormValues(values as unknown as Record<string, unknown>);

        const parsed = parseRaycastDeeplink(processedValues.command);
        if (!parsed) {
          await showError(ERROR_MESSAGES.DEEPLINK_INVALID, "Invalid Command");
          return;
        }

        const raycastCommand = createRaycastCommand(processedValues.command, processedValues.runInBackground);
        const savedCommand = createSavedSchedule(processedValues, raycastCommand, command);

        await onSave(savedCommand);
        await showSuccess(
          `Scheduled command ${command ? "updated" : "created"}`,
          `${savedCommand.name} will run ${getScheduleDescription(savedCommand.schedule)}`,
        );
        popToRoot();
      } catch (error) {
        console.error(`Error ${command ? "updating" : "creating"} scheduled command:`, error);
        await showError("Please try again", `Failed to ${command ? "update" : "create"} scheduled command`);
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      command: (value) => {
        if (!value || String(value).trim() === "") return "Command is required";
        const isValid = parseRaycastDeeplink(String(value)) !== null;
        return isValid ? undefined : ERROR_MESSAGES.DEEPLINK_INVALID;
      },
      scheduleType: FormValidation.Required,
      date: (value) => {
        if (itemProps.scheduleType.value === "once" && !value) {
          return "Date is required for 'once' schedule";
        }
      },
      time: (value) => {
        const scheduleType = itemProps.scheduleType.value;
        // Time is not required for interval-based schedules
        if (scheduleType === "15mins" || scheduleType === "30mins" || scheduleType === "hourly") {
          return undefined;
        }
        // Time is not required for cron schedules
        if (scheduleType === "cron") {
          return undefined;
        }

        if (!value) return "Time is required";
        const str = String(value).trim();
        const isValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
        return isValid ? undefined : "Time must be in 24-hour format HH:MM (e.g., 09:00)";
      },
      dayOfWeek: (value) => {
        if (itemProps.scheduleType.value === "weekly" && !value) {
          return "Day of week is required for 'weekly' schedule";
        }
      },
      dayOfMonth: (value) => {
        if (itemProps.scheduleType.value === "monthly" && !value) {
          return "Day of month is required for 'monthly' schedule";
        }
      },
      cronExpression: (value) => {
        if (itemProps.scheduleType.value === "cron" && !value) {
          return "Cron expression is required for 'cron' schedule";
        }
        if (itemProps.scheduleType.value === "cron" && value) {
          try {
            // Validate cron expression (cron-parser without seconds field by default)
            CronExpressionParser.parse(String(value));
            return undefined;
          } catch (error) {
            return "Invalid cron expression. Use format: * * * * * (minute hour day month weekday) " + error;
          }
        }
      },
    },
  });

  const parsedCommand: RaycastCommand | null = useMemo(() => {
    const currentCommand = String(itemProps.command?.value ?? "");
    const parsed = parseRaycastDeeplink(currentCommand);
    const runInBackground = Boolean(itemProps.runInBackground?.value ?? false);
    return parsed ? createRaycastCommand(currentCommand, runInBackground) : null;
  }, [itemProps.command?.value, itemProps.runInBackground?.value]);
  const currentScheduleType =
    (itemProps.scheduleType?.value as ScheduleType) ??
    ((draftValues?.scheduleType as ScheduleType) || command?.schedule.type || "daily");

  const permission = useMemo(
    () => (parsedCommand ? getCommandPermission(parsedCommand) : null),
    [parsedCommand, getCommandPermission],
  );

  // Live schedule preview based on current form state
  const schedulePreview = useMemo(() => {
    try {
      const formValues = {
        name: String(itemProps.name?.value || ""),
        command: String(itemProps.command?.value || ""),
        scheduleType: (itemProps.scheduleType?.value as ScheduleType) || "daily",
        time: String(itemProps.time?.value || ""),
        date: String(itemProps.date?.value || ""),
        dayOfWeek: itemProps.dayOfWeek?.value ? String(itemProps.dayOfWeek.value) : undefined,
        dayOfMonth: itemProps.dayOfMonth?.value ? String(itemProps.dayOfMonth.value) : undefined,
        cronExpression: itemProps.cronExpression?.value ? String(itemProps.cronExpression.value) : undefined,
        runInBackground: Boolean(itemProps.runInBackground?.value),
      } as FormValues;
      const schedule = buildScheduleFromValues(formValues);
      return getScheduleDescription(schedule);
    } catch {
      return undefined;
    }
  }, [
    itemProps.scheduleType?.value,
    itemProps.time?.value,
    itemProps.date?.value,
    itemProps.dayOfWeek?.value,
    itemProps.dayOfMonth?.value,
    itemProps.cronExpression?.value,
  ]);

  async function handleTest() {
    if (!parsedCommand) {
      await showError(ERROR_MESSAGES.DEEPLINK_INVALID, "Test Command Error");
      return;
    }
    setIsTestingCommand(true);

    try {
      await testCommandPermission(parsedCommand);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showError(message, "Failed to test command");
    } finally {
      setIsTestingCommand(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={title}
      enableDrafts
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Save Command">
            <Action.SubmitForm title={submitButtonTitle} onSubmit={handleSubmit} icon={Icon.Plus} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Test Command">
            <Action
              title={isTestingCommand ? "Testing Command…" : "Test Command Now"}
              icon={Icon.Play}
              onAction={handleTest}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.command}
        title="Raycast Deeplink"
        placeholder="e.g., raycast://script-commands/backup or raycast://extensions/owner/extension/command"
        info="Enter a Raycast deeplink (raycast://extension/command for Raycast-owned or raycast://extensions/owner/extension/command for third-party)"
      />
      <Form.TextField
        {...itemProps.name}
        title="Command Name"
        placeholder={parsedCommand ? getCommandDisplayName(parsedCommand) : "e.g., Daily Backup"}
        info="Leave empty to auto-generate from the command"
      />
      <Form.Checkbox
        {...itemProps.runInBackground}
        title="Run in Background"
        label="Execute this command in the background."
        info="When enabled, the command will run silently without user interaction. Best for automated tasks and scripts."
      />
      {parsedCommand && (
        <>
          {!permission || !permission.hasPermission ? (
            <Form.Description title={PERMISSION_MESSAGES.REQUIRED.title} text={PERMISSION_MESSAGES.REQUIRED.text} />
          ) : (
            <Form.Description
              title={PERMISSION_MESSAGES.VERIFIED.title}
              text={PERMISSION_MESSAGES.VERIFIED.getText(permission.lastTestedAt || "")}
            />
          )}
          <Form.Separator />
        </>
      )}

      {/* Schedule Type */}
      <Form.Dropdown
        id="scheduleType"
        title="Schedule Type"
        value={itemProps.scheduleType?.value as string}
        error={itemProps.scheduleType?.error as string | undefined}
        onChange={(v) => itemProps.scheduleType?.onChange?.(v as unknown as ScheduleType)}
      >
        <Form.Dropdown.Item value="once" title="Once" />
        <Form.Dropdown.Item value="15mins" title="Every 15 minutes" />
        <Form.Dropdown.Item value="30mins" title="Every 30 minutes" />
        <Form.Dropdown.Item value="hourly" title="Hourly" />
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="cron" title="Custom" />
      </Form.Dropdown>

      {/* Once: Date */}
      {currentScheduleType === "once" && (
        <Form.DatePicker
          id="date"
          title="Date"
          info="Select the date when the command should run"
          defaultValue={
            draftValues?.date
              ? new Date(draftValues.date)
              : command?.schedule.date
                ? new Date(command.schedule.date)
                : undefined
          }
          min={new Date(new Date().setDate(new Date().getDate() - 2))}
          type={Form.DatePicker.Type.Date}
          error={itemProps.date?.error as string | undefined}
          onChange={(d) => itemProps.date?.onChange?.(d ? toLocalYMD(d) : "")}
        />
      )}

      {/* Time - only show for schedules that need it */}
      {currentScheduleType !== "15mins" &&
        currentScheduleType !== "30mins" &&
        currentScheduleType !== "hourly" &&
        currentScheduleType !== "cron" && (
          <Form.TextField
            title="Time"
            placeholder="09:00"
            info="Enter time in 24-hour format (HH:MM)"
            {...itemProps.time}
          />
        )}

      {/* Weekly: Day of Week */}
      {currentScheduleType === "weekly" && (
        <Form.Dropdown title="Day of Week" {...itemProps.dayOfWeek}>
          <Form.Dropdown.Item value="1" title="Monday" />
          <Form.Dropdown.Item value="2" title="Tuesday" />
          <Form.Dropdown.Item value="3" title="Wednesday" />
          <Form.Dropdown.Item value="4" title="Thursday" />
          <Form.Dropdown.Item value="5" title="Friday" />
          <Form.Dropdown.Item value="6" title="Saturday" />
          <Form.Dropdown.Item value="7" title="Sunday" />
        </Form.Dropdown>
      )}

      {/* Monthly: Day of Month */}
      {currentScheduleType === "monthly" && (
        <Form.Dropdown title="Day of Month" {...itemProps.dayOfMonth}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <Form.Dropdown.Item key={day} value={day.toString()} title={`Day ${day}`} />
          ))}
        </Form.Dropdown>
      )}

      {/* Cron: Cron Expression */}
      {currentScheduleType === "cron" && (
        <Form.TextField
          title="Cron Expression"
          placeholder="0 9 * * *"
          info="Enter a cron expression (e.g., '0 9 * * *' for daily at 9:00 AM). Format: minute hour day month weekday"
          {...itemProps.cronExpression}
        />
      )}
      <Form.Description
        title="Schedule Summary"
        text={schedulePreview ? schedulePreview : "Adjust the fields above to preview the schedule"}
      />
    </Form>
  );
}
