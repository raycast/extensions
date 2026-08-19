import { environment } from "@raycast/api";
import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { logDiagnostic } from "./diagnostics";
import {
  DiscoveredDesk,
  mergeDiscoveredDesk,
  validateDiscoveryName,
} from "./desk-discovery";
import { DeskConfiguration, validateTarget } from "./model";
import { beginMovementRequest } from "./movement-request";
import {
  getConfiguration,
  getDeskSelection,
  hasAcknowledgedSafety,
  requireDeskSelection,
  saveCachedDeskStatus,
  DeskSelection,
} from "./storage";

export type NativeEvent = {
  event: "device" | "status" | "progress" | "complete" | "error";
  connected?: boolean;
  deskName?: string;
  identifier?: string;
  nameQuality?: number;
  heightCm?: number;
  speed?: number;
  outcome?: "reached" | "stopped";
  message?: string;
};

const helperPath = path.join(environment.assetsPath, "deskctl");
const stopRequestPath = path.join(environment.supportPath, "stop-request");
const movementLockPath = path.join(environment.supportPath, "movement.lock");

async function commonArguments(
  configuration: DeskConfiguration,
  selection?: DeskSelection,
  movementRequestID?: string,
): Promise<string[]> {
  const args = [
    "--name",
    configuration.deskName,
    "--base-height",
    String(configuration.baseHeight),
    "--minimum-height",
    String(configuration.minimumHeight),
    "--maximum-height",
    String(configuration.maximumHeight),
    "--cancel-file",
    stopRequestPath,
    "--lock-file",
    movementLockPath,
  ];
  if (selection) {
    args.push("--identifier", selection.identifier);
  }
  if (movementRequestID) {
    args.push("--movement-request-id", movementRequestID);
  }
  return args;
}

async function runNative(
  command: string,
  commandArguments: string[] = [],
  onEvent?: (event: NativeEvent) => void,
  configuration?: DeskConfiguration,
  selection?: DeskSelection,
  movementRequestID?: string,
): Promise<NativeEvent> {
  await access(helperPath).catch(async () => {
    const error = new Error(
      "The Bluetooth helper is missing. Run npm run build:native, then restart the extension.",
    );
    await logDiagnostic("error", "native.helper-missing", { command });
    throw error;
  });
  await mkdir(environment.supportPath, { recursive: true });

  const activeConfiguration = configuration ?? (await getConfiguration());
  const activeSelection =
    selection ??
    (command === "discover"
      ? await getDeskSelection()
      : await requireDeskSelection());
  const args = [
    command,
    ...commandArguments,
    ...(await commonArguments(
      activeConfiguration,
      activeSelection,
      movementRequestID,
    )),
  ];
  await logDiagnostic("info", "native.started", {
    command,
    target: commandArguments[0],
  });
  return new Promise((resolve, reject) => {
    const child = spawn(helperPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdoutBuffer = "";
    let stderr = "";
    let lastEvent: NativeEvent | undefined;
    let lastProgressLogAt = 0;
    let persistence = Promise.resolve();
    let delivery = Promise.resolve();
    let protocolError: Error | undefined;

    const acceptLine = (line: string) => {
      if (!line.trim()) return;
      try {
        const event = JSON.parse(line) as NativeEvent;
        if (
          command !== "discover" &&
          activeSelection &&
          event.identifier &&
          event.identifier.toLowerCase() !==
            activeSelection.identifier.toLowerCase()
        ) {
          protocolError = new Error(
            "The Bluetooth helper reported a different desk than the selected desk.",
          );
          child.kill("SIGTERM");
          return;
        }
        lastEvent = event;
        if (
          activeSelection &&
          event.heightCm !== undefined &&
          Number.isFinite(event.heightCm)
        ) {
          const status = {
            heightCm: event.heightCm,
            deskName: event.deskName,
            updatedAt: Date.now(),
          };
          persistence = persistence.then(() =>
            saveCachedDeskStatus(status, activeSelection.token),
          );
        }
        delivery = delivery.then(async () => {
          if (command !== "discover" && activeSelection) {
            const currentSelection = await getDeskSelection();
            if (currentSelection?.token !== activeSelection.token) return;
          }
          onEvent?.(event);
        });
        const now = Date.now();
        if (event.event !== "progress" || now - lastProgressLogAt >= 1_000) {
          lastProgressLogAt = now;
          void logDiagnostic(
            event.event === "error" ? "error" : "info",
            "native.event",
            {
              command,
              event: event.event,
              connected: event.connected,
              heightCm: event.heightCm,
              speed: event.speed,
              outcome: event.outcome,
              message: event.message,
            },
          );
        }
      } catch {
        stderr += `${line}\n`;
      }
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      lines.forEach(acceptLine);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      void logDiagnostic("error", "native.spawn-failed", {
        command,
        message: error.message,
      });
      reject(error);
    });
    child.on("close", async (code) => {
      acceptLine(stdoutBuffer);
      try {
        await Promise.all([persistence, delivery]);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (protocolError) {
        reject(protocolError);
        return;
      }
      if (command !== "discover" && activeSelection) {
        const currentSelection = await getDeskSelection();
        if (currentSelection?.token !== activeSelection.token) {
          reject(
            new Error(
              "The selected desk changed before the command completed.",
            ),
          );
          return;
        }
      }
      if (code === 0 && lastEvent) {
        void logDiagnostic("info", "native.completed", { command, code });
        resolve(lastEvent);
        return;
      }
      const fallbackMessage = `The Bluetooth helper exited without completing${code === null ? "." : ` (code ${code}).`}`;
      const message = lastEvent?.message || stderr.trim() || fallbackMessage;
      void logDiagnostic("error", "native.failed", {
        command,
        code,
        message,
      });
      reject(new Error(message));
    });
  });
}

export async function readDesk(
  onEvent?: (event: NativeEvent) => void,
): Promise<NativeEvent> {
  const configuration = await getConfiguration();
  const selection = await requireDeskSelection();
  return runNative("status", [], onEvent, configuration, selection);
}

export async function discoverDesks(
  deskName: string,
  onDevice?: (desk: DiscoveredDesk) => void,
): Promise<DiscoveredDesk[]> {
  const nameFilter = validateDiscoveryName(deskName);
  const configuration = await getConfiguration();
  const selection = await getDeskSelection();
  const desks: DiscoveredDesk[] = [];
  await runNative(
    "discover",
    [],
    (event) => {
      if (event.event !== "device" || !event.identifier || !event.deskName) {
        return;
      }
      const desk = {
        identifier: event.identifier,
        name: event.deskName,
        nameQuality: event.nameQuality ?? 0,
        connected: event.connected === true,
      };
      const merged = mergeDiscoveredDesk(desks, desk);
      desks.splice(0, desks.length, ...merged);
      onDevice?.(desk);
    },
    { ...configuration, deskName: nameFilter },
    selection,
  );
  return desks;
}

export async function moveDesk(
  targetHeight: number,
  onEvent?: (event: NativeEvent) => void,
): Promise<NativeEvent> {
  const movementRequestID = await beginMovementRequest(stopRequestPath);
  const configuration = await getConfiguration();
  const selection = await requireDeskSelection();
  if (!(await hasAcknowledgedSafety(selection.token))) {
    throw new Error("Review the safety notice before moving the desk.");
  }
  const target = validateTarget(targetHeight, configuration);
  return runNative(
    "move",
    [String(target)],
    onEvent,
    configuration,
    selection,
    movementRequestID,
  );
}

export async function nudgeDesk(
  direction: "up" | "down",
  onEvent?: (event: NativeEvent) => void,
): Promise<NativeEvent> {
  const movementRequestID = await beginMovementRequest(stopRequestPath);
  const configuration = await getConfiguration();
  const selection = await requireDeskSelection();
  if (!(await hasAcknowledgedSafety(selection.token))) {
    throw new Error("Review the safety notice before moving the desk.");
  }
  const delta =
    direction === "up" ? configuration.stepHeight : -configuration.stepHeight;
  return runNative(
    "nudge",
    [String(delta)],
    onEvent,
    configuration,
    selection,
    movementRequestID,
  );
}

export async function requestStop(): Promise<string> {
  return beginMovementRequest(stopRequestPath);
}

async function waitForMovementHandoff(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));
}

export async function cancelActiveMovement(): Promise<string> {
  const requestID = await requestStop();
  await waitForMovementHandoff();
  return requestID;
}

export async function stopDesk(
  onEvent?: (event: NativeEvent) => void,
): Promise<NativeEvent> {
  const configuration = await getConfiguration();
  const selection = await getDeskSelection();
  const stopRequestID = await requestStop();
  await waitForMovementHandoff();
  if (!selection) {
    throw new Error("No desk is selected. The active movement was cancelled.");
  }
  return runNative(
    "stop",
    [],
    onEvent,
    configuration,
    selection,
    stopRequestID,
  );
}
