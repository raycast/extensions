import { homeOnDevice, launchOnDevice, restoreActivity, restoreKnownActivity, sendKey, turnOn } from "./actions";
import { createRoutineActivityController } from "./activity";
import { createClient } from "./preferences";
import { getSavedDevices, getSelectedDevice } from "./storage";
import { getRoutines } from "./routine-store";
import { runRoutine, validateRoutine } from "./routines";
import type { Routine, RunRoutineOptions } from "./routines";
import { describeRokuError } from "./roku";
import type { RokuApp, RokuDevice } from "./types";
import { parseInstruction } from "./instructions";
import type { InstructionContext, InstructionPlan } from "./instructions";
import { getInstructionSettings } from "./instruction-store";
export type { ActionResult } from "./activity";

export interface DeviceStatus {
  device: RokuDevice;
  reachable: boolean;
  activeApp?: RokuApp;
  powerMode?: string;
  controlMode?: string;
  error?: string;
}

export async function getDashboard(): Promise<DeviceStatus[]> {
  const devices = await getSavedDevices();
  return Promise.all(
    devices.map(async (device): Promise<DeviceStatus> => {
      const client = createClient(device);
      const [info, active] = await Promise.allSettled([client.getDeviceInfo(), client.getActiveApp()]);
      if (info.status === "rejected") return { device, reachable: false, error: describeRokuError(info.reason) };
      if (info.value.id !== device.id)
        return { device, reachable: false, error: "A different Roku is at this address. Discover TVs again." };
      return {
        device,
        reachable: true,
        powerMode: info.value.powerMode,
        controlMode: info.value.controlMode,
        activeApp: active.status === "fulfilled" ? active.value : undefined,
        error: active.status === "rejected" ? describeRokuError(active.reason) : undefined,
      };
    }),
  );
}

export const restorePrevious = restoreActivity;

async function requireDevice(id: string): Promise<RokuDevice> {
  const device = (await getSavedDevices()).find((tv) => tv.id === id);
  if (!device) throw new Error("This TV is no longer saved. Edit the routine or choose a saved TV.");
  return device;
}

export async function executeRoutine(input: Routine, options: RunRoutineOptions = {}) {
  const routine = validateRoutine(input);
  const device = await requireDevice(routine.deviceId);
  const activity = createRoutineActivityController({
    launch: (id, remember) => launchOnDevice(device, id, { remember, signal: options.signal }),
    home: (remember) => homeOnDevice(device, { remember, signal: options.signal }),
    restore: () => restorePrevious(device, { signal: options.signal }),
    restoreKnown: (app) => restoreKnownActivity(device, app, { signal: options.signal }),
  });
  return runRoutine(
    routine,
    {
      async wake() {
        try {
          const info = await createClient(device).getDeviceInfo();
          if (info.id !== device.id) throw new Error("A different Roku is at this address. Discover TVs again.");
          if (info.isTv && info.powerMode === "PowerOn") return;
        } catch (error) {
          if (!(error instanceof Error) || error.message.includes("different Roku")) throw error;
        }
        if (!(await turnOn(device, { signal: options.signal })))
          throw new Error("Wake was sent but TV power is unconfirmed. Later steps were stopped.");
      },
      async launch(id) {
        const result = await activity.launch(id);
        if (!result.confirmed) throw new Error(result.message + ". Later steps were stopped.");
      },
      async key(key) {
        if (key === "Home") {
          const result = await activity.home();
          if (!result.confirmed) throw new Error(result.message + ". Later steps were stopped.");
        } else await sendKey(device, key, { signal: options.signal });
      },
      async restore() {
        const result = await activity.restore();
        if (!result.confirmed) throw new Error(result.message + ". Later steps were stopped.");
      },
    },
    options,
  );
}

export async function getInstructionContext(): Promise<InstructionContext> {
  const [devices, selected, routines, settings] = await Promise.all([
    getSavedDevices(),
    getSelectedDevice(),
    getRoutines(),
    getInstructionSettings(),
  ]);
  const entries = await Promise.all(
    devices.map(async (device) => {
      try {
        const client = createClient(device);
        const [info, apps] = await Promise.all([client.getDeviceInfo(), client.getApps()]);
        return [device.id, info.id === device.id ? apps : []] as const;
      } catch {
        return [device.id, []] as const;
      }
    }),
  );
  return { devices, selectedDeviceId: selected?.id, appsByDevice: Object.fromEntries(entries), routines, settings };
}

export interface PreparedInstruction {
  plan: InstructionPlan;
  routines: Routine[];
}

export async function prepareInstruction(text: string): Promise<PreparedInstruction> {
  const context = await getInstructionContext();
  const plan = parseInstruction(text, context);
  const ids = new Set(plan.steps.filter((step) => step.kind === "routine").map((step) => step.routineId));
  return { plan, routines: (await getRoutines()).filter((routine) => ids.has(routine.id)) };
}

export async function executeInstruction(
  prepared: PreparedInstruction,
  options: { signal?: AbortSignal; onProgress?: (message: string) => void } = {},
) {
  // Re-resolve before mutation: a changed default, alias or edited routine requires a new preview.
  const latest = await prepareInstruction(prepared.plan.text);
  if (JSON.stringify(latest) !== JSON.stringify(prepared))
    throw new Error("Your TVs or instructions changed. Preview this instruction again before running it.");
  const results: string[] = [];
  for (let index = 0; index < latest.plan.steps.length; index++) {
    if (options.signal?.aborted) return { status: "cancelled" as const, results };
    const step = latest.plan.steps[index];
    const device = await requireDevice(step.deviceId);
    options.onProgress?.(latest.plan.preview[index] ?? `Step ${index + 1}`);
    try {
      if (step.kind === "routine") {
        const routine = latest.routines.find((item) => item.id === step.routineId);
        if (!routine || routine.deviceId !== device.id)
          throw new Error("The saved routine changed. Preview the instruction again.");
        const result = await executeRoutine(routine, { signal: options.signal });
        if (result.status === "cancelled") return { status: "cancelled" as const, results };
        if (result.status === "failed") throw new Error(result.error ?? "The routine stopped.");
        results.push(`Completed ${routine.name} on ${device.name}`);
      } else if (step.kind === "launch") {
        const result = await launchOnDevice(device, step.appId, { name: step.appName, signal: options.signal });
        results.push(`${device.name}: ${result.message}`);
        if (!result.confirmed) return { status: "unconfirmed" as const, results };
      } else if (step.kind === "restore") {
        const result = await restorePrevious(device, { signal: options.signal });
        results.push(`${device.name}: ${result.message}`);
        if (!result.confirmed) return { status: "unconfirmed" as const, results };
      } else {
        for (let count = 0; count < step.count; count++) {
          if (options.signal?.aborted) return { status: "cancelled" as const, results };
          if (step.key === "PowerOn") {
            if (!(await turnOn(device, { signal: options.signal })))
              return {
                status: "unconfirmed" as const,
                results: [...results, `${device.name}: wake sent, power unconfirmed`],
              };
          } else if (step.key === "Home") {
            const result = await homeOnDevice(device, { signal: options.signal });
            if (!result.confirmed)
              return { status: "unconfirmed" as const, results: [...results, `${device.name}: ${result.message}`] };
          } else await sendKey(device, step.key, { signal: options.signal });
        }
        results.push(`${device.name}: ${step.key} sent ${step.count} time${step.count === 1 ? "" : "s"}`);
      }
    } catch (error) {
      if (options.signal?.aborted) return { status: "cancelled" as const, results };
      return {
        status: "failed" as const,
        results: [...results, `Step ${index + 1} stopped: ${describeRokuError(error)}`],
      };
    }
  }
  return { status: "completed" as const, results };
}
