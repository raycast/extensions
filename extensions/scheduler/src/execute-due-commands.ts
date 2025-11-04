import { showToast, Toast } from "@raycast/api";
import { ScheduledCommand, ExecutionLog } from "./types";
import { generateId } from "./utils";
import { STORAGE_KEYS } from "./utils/constants";
import { getStoredData, setStoredData } from "./utils/storage";
import { executeRaycastCommand } from "./utils/commandExecution";
import { isCommandDue, wasScheduleMissed } from "./utils/schedule";

const LOG_MESSAGES = {
  CHECKING: "Execute Due Commands: Checking for due scheduled commands",
  NO_COMMANDS: "No scheduled commands found",
  SKIPPING_DISABLED: (name: string) => `Skipping disabled command: ${name}`,
  EXECUTING: (name: string) => `Executing scheduled command: ${name}`,
  EXECUTING_MISSED: (name: string) => `Executing missed command: ${name}`,
  DISABLING_ONCE: (name: string) => `Disabling "once" command before execution: ${name}`,
  EXECUTED_COUNT: (count: number) => `Execute Due Commands: Executed ${count} scheduled commands`,
  NO_DUE_COMMANDS: "Execute Due Commands: No commands due for execution",
  SUCCESS: (name: string) => `Successfully executed command: ${name}`,
  ERROR_EXECUTING: (name: string) => `Error executing command "${name}":`,
  LAUNCHING: (deeplink: string) => `Launching Raycast command: ${deeplink}`,
  DISABLED_ONCE: (name: string) => `Successfully disabled "once" command: ${name}`,
  UPDATED_MISSED_CHECK: (name: string) => `Updated lastMissedCheck for command: ${name}`,
} as const;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error occurred";
};

const createExecutionLog = (command: ScheduledCommand): ExecutionLog => ({
  id: generateId(),
  commandId: command.id,
  commandName: command.name,
  executedAt: new Date().toISOString(),
  status: "success",
});

async function handleExecutionLog(log: ExecutionLog, commandName: string): Promise<void> {
  await saveExecutionLog(log);
  try {
    await showToast({
      style: log.status === "success" ? Toast.Style.Success : Toast.Style.Failure,
      title: `Scheduled Command: ${commandName}`,
      message: log.status === "success" ? "Executed successfully" : `Error: ${log.errorMessage}`,
    });
  } catch {
    console.log("Could not show toast notification (background mode)");
  }
}

async function getCommands(): Promise<ScheduledCommand[]> {
  return await getStoredData<ScheduledCommand[]>(STORAGE_KEYS.SCHEDULED_COMMANDS, []);
}

async function updateCommand(updatedCommand: ScheduledCommand): Promise<void> {
  try {
    const commands = await getCommands();
    const index = commands.findIndex((cmd) => cmd.id === updatedCommand.id);
    if (index !== -1) {
      commands[index] = updatedCommand;
      await setStoredData(STORAGE_KEYS.SCHEDULED_COMMANDS, commands);
    }
  } catch (error) {
    console.error("Error updating command:", error);
  }
}

async function disableCommand(command: ScheduledCommand): Promise<void> {
  try {
    const commands = await getCommands();
    const updatedCommands = commands.map((c) => (c.id === command.id ? { ...c, enabled: false } : c));
    await setStoredData(STORAGE_KEYS.SCHEDULED_COMMANDS, updatedCommands);
    console.log(LOG_MESSAGES.DISABLED_ONCE(command.name));
  } catch (error) {
    console.error(`Error disabling command "${command.name}":`, error);
  }
}

export default async function ExecuteDueCommands() {
  console.log(LOG_MESSAGES.CHECKING);

  try {
    const commands = await getCommands();
    if (commands.length === 0) {
      console.log(LOG_MESSAGES.NO_COMMANDS);
      return;
    }

    const now = new Date();
    let executedCount = 0;

    for (const command of commands) {
      if (!command.enabled) {
        console.log(LOG_MESSAGES.SKIPPING_DISABLED(command.name));
        continue;
      }

      const isDue = isCommandDue(command, now);
      const isMissed = !isDue && wasScheduleMissed(command, now);

      if (isDue) {
        console.log(LOG_MESSAGES.EXECUTING(command.name));

        // Disable "once" commands BEFORE execution in case the launch doesn't return
        if (command.schedule.type === "once") {
          console.log(LOG_MESSAGES.DISABLING_ONCE(command.name));
          await disableCommand(command);
        }

        await executeCommand(command, now);
        executedCount++;
      } else if (isMissed) {
        console.log(LOG_MESSAGES.EXECUTING_MISSED(command.name));

        // Execute the missed command
        await executeCommand(command, now);
        executedCount++;
      } else {
        // Update lastMissedCheck even if not due, to track that we checked
        if (command.runIfMissed) {
          await updateCommandMissedCheck(command, now);
        }
      }
    }

    if (executedCount > 0) {
      console.log(LOG_MESSAGES.EXECUTED_COUNT(executedCount));
    } else {
      console.log(LOG_MESSAGES.NO_DUE_COMMANDS);
    }
  } catch (error) {
    console.error("Error in Execute Due Commands:", error);
  }
}

async function executeCommand(command: ScheduledCommand, now: Date): Promise<void> {
  const log = createExecutionLog(command);
  const executionTime = now.toISOString();

  try {
    console.log(LOG_MESSAGES.LAUNCHING(command.command.deeplink));
    await executeRaycastCommand(command.command);
    console.log(LOG_MESSAGES.SUCCESS(command.name));

    // Update the command's lastExecutedAt and lastMissedCheck fields after successful execution
    const updatedCommand = {
      ...command,
      lastExecutedAt: executionTime,
      lastMissedCheck: executionTime,
      updatedAt: executionTime,
    };
    await updateCommand(updatedCommand);
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_EXECUTING(command.name), error);
    log.status = "error";
    log.errorMessage = getErrorMessage(error);
  }

  await handleExecutionLog(log, command.name);
}

async function updateCommandMissedCheck(command: ScheduledCommand, now: Date): Promise<void> {
  try {
    const updatedCommand = {
      ...command,
      lastMissedCheck: now.toISOString(),
    };
    await updateCommand(updatedCommand);
    console.log(LOG_MESSAGES.UPDATED_MISSED_CHECK(command.name));
  } catch (error) {
    console.error(`Error updating missed check for command "${command.name}":`, error);
  }
}

async function saveExecutionLog(log: ExecutionLog): Promise<void> {
  try {
    const logs = await getStoredData<ExecutionLog[]>(STORAGE_KEYS.EXECUTION_LOGS, []);
    logs.push(log);
    await setStoredData(STORAGE_KEYS.EXECUTION_LOGS, logs);
  } catch (error) {
    console.error("Error saving execution log:", error);
  }
}
