import { ActionPanel, Action, Form, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import { ScheduledCommand, RaycastCommand, FormValues, ScheduleType } from "../types";
import { ScheduleForm } from "./ScheduleForm";
import { useCommandPermissions } from "../hooks/useCommandPermissions";
import {
  validateFormValues,
  getScheduleDescription,
  parseRaycastDeeplink,
  validateRaycastDeeplink,
  getCommandDisplayName,
  processFormValues,
  createRaycastCommand,
  createSavedCommand,
} from "../utils";

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
    getText: (date: string) => `This command was last tested successfully on ${new Date(date).toLocaleDateString()}.`,
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
  const [parsedCommand, setParsedCommand] = useState<RaycastCommand | null>(null);
  const { getCommandPermission, testCommandPermission } = useCommandPermissions();
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    (draftValues?.scheduleType as ScheduleType) || command?.schedule.type || "daily",
  );
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      command: (draftValues?.command as string) ?? (command ? command.command.deeplink : ""),
      name: (draftValues?.name as string) ?? (command?.name || ""),
      runInBackground: (draftValues?.runInBackground as boolean | undefined) ?? command?.command.type === "background",
      scheduleType: (draftValues?.scheduleType as ScheduleType) ?? (command?.schedule.type || "daily"),
      time: (draftValues?.time as string) ?? (command?.schedule.time || "09:00"),
      date: (draftValues?.date as string) ?? (command?.schedule.date || ""),
      dayOfWeek: (draftValues?.dayOfWeek as string) ?? command?.schedule.dayOfWeek?.toString(),
    },
    async onSubmit(values) {
      setIsSubmitting(true);
      try {
        const processedValues = processFormValues(values as unknown as Record<string, unknown>);
        const validationError = validateFormValues(processedValues);
        if (validationError) {
          await showError(validationError, "Validation Error");
          return;
        }

        const parsed = parseRaycastDeeplink(processedValues.command);
        if (!parsed) {
          await showError("Could not parse the Raycast deeplink", "Invalid Command");
          return;
        }

        const raycastCommand = createRaycastCommand(processedValues.command, processedValues.runInBackground);
        const savedCommand = createSavedCommand(processedValues, raycastCommand, command);

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
        return validateRaycastDeeplink(String(value));
      },
      scheduleType: FormValidation.Required,
      date: (value) => {
        if (itemProps.scheduleType.value === "once" && !value) {
          return "Date is required for 'once' schedule";
        }
      },
      time: FormValidation.Required,
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
    },
  });

  useEffect(() => {
    const value = (itemProps.command?.value as string) || "";
    const runBg = Boolean(itemProps.runInBackground?.value as boolean | undefined);
    const validationError = value ? validateRaycastDeeplink(value) : "Command is required";
    if (value.trim() && !validationError) {
      setParsedCommand(createRaycastCommand(value.trim(), runBg));
    } else {
      setParsedCommand(null);
    }
  }, [itemProps.command?.value, itemProps.runInBackground?.value]);

  async function handleTest(values: Record<string, unknown>) {
    setIsTestingCommand(true);

    try {
      const processedValues = processFormValues(values as unknown as Record<string, unknown>);
      const validationError = validateFormValues(processedValues);
      if (validationError) {
        await showError(validationError, "Validation Error");
        return;
      }

      const parsed = parseRaycastDeeplink(processedValues.command);
      if (!parsed) {
        await showError("Could not parse the Raycast deeplink", "Invalid Command");
        return;
      }

      const raycastCommand = createRaycastCommand(processedValues.command, processedValues.runInBackground);

      await testCommandPermission(raycastCommand);
    } catch (error) {
      console.error("Error during test command:", error);
      await showError("Failed to test command");
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
              onAction={() =>
                handleTest({
                  name: String(itemProps.name?.value ?? ""),
                  command: String(itemProps.command?.value ?? ""),
                  runInBackground: Boolean(itemProps.runInBackground?.value ?? false),
                  scheduleType: String(itemProps.scheduleType?.value ?? scheduleType) as ScheduleType,
                  time: String(itemProps.time?.value ?? ""),
                  date: String(itemProps.date?.value ?? ""),
                  dayOfWeek: String(itemProps.dayOfWeek?.value ?? ""),
                  dayOfMonth: String(itemProps.dayOfMonth?.value ?? ""),
                })
              }
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
      {parsedCommand &&
        (() => {
          const permission = getCommandPermission(parsedCommand);

          if (!permission || !permission.hasPermission) {
            return (
              <>
                <Form.Description title={PERMISSION_MESSAGES.REQUIRED.title} text={PERMISSION_MESSAGES.REQUIRED.text} />
                <Form.Separator />
              </>
            );
          }

          return (
            <>
              <Form.Description
                title={PERMISSION_MESSAGES.VERIFIED.title}
                text={PERMISSION_MESSAGES.VERIFIED.getText(permission.lastTestedAt || "")}
              />
              <Form.Separator />
            </>
          );
        })()}
      <ScheduleForm
        scheduleType={scheduleType}
        onScheduleTypeChange={setScheduleType}
        command={command}
        draftValues={draftValues}
      />
    </Form>
  );
}
