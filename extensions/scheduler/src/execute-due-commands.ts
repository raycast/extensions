import { showToast, Toast } from "@raycast/api";
import { ScheduledCommand, ExecutionLog } from "./types";
import { generateId } from "./utils";
import { STORAGE_KEYS } from "./utils/constants";
import { getStoredData, loadScheduledCommands, setStoredData } from "./utils/storage";
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

const shouldAutoDisableOnError = (message: string): boolean => {
  const lower = message.toLowerCase();

  // Proxy errors and Array.prototype.indexOf runtime issues are environmental
  // (e.g. corporate proxy, polyfill conflicts) — not command-specific, so skip.
  if (lower.includes("proxy") || lower.includes("indexof")) return false;

  return (
    // V8: "Cannot read properties of undefined (reading 'settings')" — extension
    // not installed or missing expected config; varies by quote style across engines.
    lower.includes("cannot read propert") ||
    lower.includes("command not found") ||
    lower.includes("invalid raycast deeplink") ||
    lower.includes("incomplete extension command data")
  );
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

function applyCommandUpdate(raw: unknown[], indexById: Map<string, number>, updatedCommand: ScheduledCommand): void {
  const idx = indexById.get(updatedCommand.id);
  if (idx === undefined) return;
  raw[idx] = updatedCommand;
}

function applyDisable(raw: unknown[], indexById: Map<string, number>, commandToDisable: ScheduledCommand): void {
  const idx = indexById.get(commandToDisable.id);
  if (idx === undefined) return;
  raw[idx] = { ...commandToDisable, enabled: false, updatedAt: new Date().toISOString() };
  console.log(LOG_MESSAGES.DISABLED_ONCE(commandToDisable.name));
}

export default async function ExecuteDueCommands() {
  console.log(LOG_MESSAGES.CHECKING);

  setStoredData(STORAGE_KEYS.BACKGROUND_REFRESH_STATUS, {
    enabled: true,
    lastBackgroundRun: new Date().toISOString(),
  });

  try {
    const loaded = await loadScheduledCommands(STORAGE_KEYS.SCHEDULED_COMMANDS);
    const commands = loaded.commands;
    const rawToUpdate = [...loaded.raw];
    const indexById = loaded.indexById;

    let didMutateStorage = loaded.migratedCount > 0;
    if (commands.length === 0) {
      console.log(LOG_MESSAGES.NO_COMMANDS);
      if (didMutateStorage) {
        await setStoredData(STORAGE_KEYS.SCHEDULED_COMMANDS, rawToUpdate);
      }
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

        let commandToExecute = command;
        if (command.schedule.type === "once") {
          console.log(LOG_MESSAGES.DISABLING_ONCE(command.name));
          commandToExecute = { ...command, enabled: false, updatedAt: now.toISOString() };
          applyDisable(rawToUpdate, indexById, command);
          didMutateStorage = true;
        }

        didMutateStorage = (await executeCommand(rawToUpdate, indexById, commandToExecute, now)) || didMutateStorage;
        executedCount++;
      } else if (isMissed) {
        console.log(LOG_MESSAGES.EXECUTING_MISSED(command.name));

        didMutateStorage = (await executeCommand(rawToUpdate, indexById, command, now)) || didMutateStorage;
        executedCount++;
      } else {
        if (command.runIfMissed) {
          didMutateStorage = updateCommandMissedCheck(rawToUpdate, indexById, command, now) || didMutateStorage;
        }
      }
    }

    if (didMutateStorage) {
      await setStoredData(STORAGE_KEYS.SCHEDULED_COMMANDS, rawToUpdate);
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

async function executeCommand(
  raw: unknown[],
  indexById: Map<string, number>,
  command: ScheduledCommand,
  now: Date,
): Promise<boolean> {
  const log = createExecutionLog(command);
  const executionTime = now.toISOString();
  let didMutate = false;

  try {
    console.log(LOG_MESSAGES.LAUNCHING(command.command.deeplink));
    await executeRaycastCommand(command.command);
    console.log(LOG_MESSAGES.SUCCESS(command.name));

    const updatedCommand = {
      ...command,
      lastExecutedAt: executionTime,
      lastMissedCheck: executionTime,
      updatedAt: executionTime,
    };
    applyCommandUpdate(raw, indexById, updatedCommand);
    didMutate = true;
  } catch (error) {
    console.error(LOG_MESSAGES.ERROR_EXECUTING(command.name), error);
    log.status = "error";

    const message = getErrorMessage(error);
    log.errorMessage = message;

    if (shouldAutoDisableOnError(message)) {
      const disabledCommand: ScheduledCommand = {
        ...command,
        enabled: false,
        updatedAt: executionTime,
      };
      applyCommandUpdate(raw, indexById, disabledCommand);
      didMutate = true;
      log.errorMessage = `${message} (auto-disabled)`;
    }
  }

  await handleExecutionLog(log, command.name);
  return didMutate;
}

function updateCommandMissedCheck(
  raw: unknown[],
  indexById: Map<string, number>,
  command: ScheduledCommand,
  now: Date,
): boolean {
  try {
    const updatedCommand = {
      ...command,
      lastMissedCheck: now.toISOString(),
    };
    applyCommandUpdate(raw, indexById, updatedCommand);
    console.log(LOG_MESSAGES.UPDATED_MISSED_CHECK(command.name));
    return true;
  } catch (error) {
    console.error(`Error updating missed check for command "${command.name}":`, error);
    return false;
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
