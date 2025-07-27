import { ActionPanel, Action, Form, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { ScheduledCommand, ScheduleType, RaycastCommand } from "../types";
import { ScheduleForm } from "./ScheduleForm";
import { useCommandPermissions } from "../hooks/useCommandPermissions";
import {
  FormValues,
  validateFormValues,
  buildScheduleFromValues,
  getScheduleDescription,
  generateId,
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

export function CommandForm({ command, onSave, title, submitButtonTitle }: CommandFormProps) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>(command?.schedule.type || "daily");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commandError, setCommandError] = useState<string>();
  const [parsedCommand, setParsedCommand] = useState<RaycastCommand | null>(null);
  const [isTestingCommand, setIsTestingCommand] = useState(false);

  const { getCommandPermission, testCommandPermission } = useCommandPermissions();

  useEffect(() => {
    if (command) {
      setScheduleType(command.schedule.type);
      setParsedCommand(command.command);
    }
  }, [command]);

  const showError = async (message: string, title = "Error") => {
    showFailureToast(new Error(message), { title });
  };

  const showSuccess = async (title: string, message: string) => {
    await showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  };

  function handleCommandChange(value: string) {
    const validationError = validateRaycastDeeplink(value);
    setCommandError(validationError || undefined);

    if (!validationError && value.trim()) {
      setParsedCommand(createRaycastCommand(value.trim()));
    } else {
      setParsedCommand(null);
    }
  }

  async function handleTest(values: Record<string, unknown>) {
    setIsTestingCommand(true);

    try {
      const processedValues = processFormValues(values);
      const validationError = validateFormValues(processedValues);

      if (validationError) {
        await showError(validationError, "Validation Error");
        return;
      }

      const raycastCommand = createRaycastCommand(processedValues.command, processedValues.runInBackground);
      const savedCommand = createSavedCommand(processedValues, raycastCommand, command);

      await onSave(savedCommand);
      await testCommandPermission(raycastCommand);
      await showSuccess("Command Tested", `${raycastCommand.deeplink} has been tested successfully.`);
    } catch (error) {
      console.error("Error during test command:", error);
      await showError("Failed to test command");
    } finally {
      setIsTestingCommand(false);
    }
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setIsSubmitting(true);

    try {
      const processedValues = processFormValues(values);
      const validationError = validateFormValues(processedValues);

      if (validationError) {
        await showError(validationError, "Validation Error");
        return;
      }

      const parsedCommand = parseRaycastDeeplink(processedValues.command);
      if (!parsedCommand) {
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
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Save Command">
            <Action.SubmitForm title={submitButtonTitle} onSubmit={handleSubmit} icon={Icon.Plus} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Test Command">
            <Action.SubmitForm
              title={isTestingCommand ? "Testing Command…" : "Test Command Now"}
              icon={Icon.Play}
              onSubmit={handleTest}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="command"
        title="Raycast Deeplink"
        placeholder="e.g., raycast://script-commands/backup or raycast://extensions/owner/extension/command"
        info="Enter a Raycast deeplink (raycast://extension/command for Raycast-owned or raycast://extensions/owner/extension/command for third-party)"
        defaultValue={command ? command.command.deeplink : undefined}
        error={commandError}
        onChange={handleCommandChange}
      />

      <Form.TextField
        id="name"
        title="Command Name"
        placeholder={parsedCommand ? getCommandDisplayName(parsedCommand) : "e.g., Daily Backup"}
        info="Leave empty to auto-generate from the command"
        defaultValue={command?.name}
      />

      <Form.Checkbox
        id="runInBackground"
        title="Run in Background"
        label="Execute this command in the background."
        info="When enabled, the command will run silently without user interaction. Best for automated tasks and scripts."
        defaultValue={command?.command.type === "background"}
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

      <ScheduleForm scheduleType={scheduleType} onScheduleTypeChange={setScheduleType} command={command} />
    </Form>
  );
}
