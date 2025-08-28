import { showToast, Toast } from "@raycast/api";
import { ScheduledCommand, ExecutionLog } from "./types";
import { generateId } from "./utils";
import { STORAGE_KEYS } from "./utils/constants";
import { getStoredData, setStoredData } from "./utils/storage";
import { executeRaycastCommand } from "./utils/commandExecution";
import { isCommandDue } from "./utils/schedule";

const LOG_MESSAGES = {
  CHECKING: "Execute Due Commands: Checking for due scheduled commands",
  NO_COMMANDS: "No scheduled commands found",
  SKIPPING_DISABLED: (name: string) => `Skipping disabled command: ${name}`,
  EXECUTING: (name: string) => `Executing scheduled command: ${name}`,
  DISABLING_ONCE: (name: string) => `Disabling "once" command before execution: ${name}`,
  EXECUTED_COUNT: (count: number) => `Execute Due Commands: Executed ${count} scheduled commands`,
  NO_DUE_COMMANDS: "Execute Due Commands: No commands due for execution",
  SUCCESS: (name: string) => `Successfully executed command: ${name}`,
  ERROR_EXECUTING: (name: string) => `Error executing command "${name}":`,
  LAUNCHING: (deeplink: string) => `Launching Raycast command: ${deeplink}`,
  DISABLED_ONCE: (name: string) => `Successfully disabled "once" command: ${name}`,
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

      if (!isCommandDue(command, now)) {
        continue;
      }

      console.log(LOG_MESSAGES.EXECUTING(command.name));

      // Disable "once" commands BEFORE execution in case the launch doesn't return
      if (command.schedule.type === "once") {
        console.log(LOG_MESSAGES.DISABLING_ONCE(command.name));
        await disableCommand(command);
      }

      await executeCommand(command);
      executedCount++;
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

async function executeCommand(command: ScheduledCommand): Promise<void> {
  const log = createExecutionLog(command);

  try {
    console.log(LOG_MESSAGES.LAUNCHING(command.command.deeplink));
    await executeRaycastCommand(command.command);
    console.log(LOG_MESSAGES.SUCCESS(command.name));
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_EXECUTING(command.name), error);
    log.status = "error";
    log.errorMessage = getErrorMessage(error);
  }

  await handleExecutionLog(log, command.name);
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
