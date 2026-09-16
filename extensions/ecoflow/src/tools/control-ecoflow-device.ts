import { Tool } from "@raycast/api";
import { findDeviceCommand, formatCommandValue, validateCommandValue } from "../devices/commands";
import { createEcoFlowService } from "../devices/runtime";
import { maskSerialNumber } from "../devices/service";

type Input = {
  /** Device name or serial number. A partial name is accepted only when it matches one device. */
  deviceIdentifier: string;
  /** A control ID returned by get-device-status in availableControls. */
  command: string;
  /** Numeric value required by number and select controls. Omit it for on/off controls. */
  value?: number;
};

interface ConfirmedTarget {
  serialNumber: string;
  expiresAt: number;
}

const CONFIRMATION_TTL_MS = 5 * 60 * 1_000;
const confirmedTargets = new Map<string, ConfirmedTarget>();

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const device = await createEcoFlowService().getDeviceSnapshot(input.deviceIdentifier);
  if (!device.online) throw new Error(`${device.name} is offline.`);

  const command = findDeviceCommand(device, input.command);
  if (!command) {
    throw new Error(`${device.profile.displayName} does not support the requested control "${input.command}".`);
  }
  validateCommandValue(command, input.value);
  command.buildPayload(input.value, device.quotas);
  removeExpiredConfirmedTargets();
  confirmedTargets.set(confirmationKey(input), {
    serialNumber: device.serialNumber,
    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
  });

  const info = [
    { name: "Device", value: device.name },
    { name: "Model", value: device.profile.displayName },
    { name: "Serial", value: maskSerialNumber(device.serialNumber) },
    { name: "Control", value: command.title },
  ];
  const formattedValue = formatCommandValue(command, input.value);
  if (formattedValue !== undefined) info.push({ name: "Value", value: formattedValue });

  return {
    message: "EcoFlow will change this physical device after you confirm.",
    info,
  };
};

export default async function tool(input: Input) {
  try {
    const serialNumber = consumeConfirmedTarget(input);
    const service = createEcoFlowService();
    const result = await service.executeCommand({
      serialNumber,
      commandId: input.command,
      ...(input.value !== undefined ? { value: input.value } : {}),
    });
    return {
      success: true,
      device: result.device.name,
      control: result.commandTitle,
      message: `${result.device.name} accepted the control request.`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "The EcoFlow control failed.",
    };
  }
}

function consumeConfirmedTarget(input: Input): string {
  const key = confirmationKey(input);
  const target = confirmedTargets.get(key);
  confirmedTargets.delete(key);

  if (!target || target.expiresAt < Date.now()) {
    throw new Error("The confirmed device binding is missing or expired. Confirm the control again.");
  }

  return target.serialNumber;
}

function confirmationKey(input: Input): string {
  return JSON.stringify([
    input.deviceIdentifier.trim().toLowerCase(),
    input.command.trim().toLowerCase(),
    input.value ?? null,
  ]);
}

function removeExpiredConfirmedTargets(): void {
  const now = Date.now();
  for (const [key, target] of confirmedTargets) {
    if (target.expiresAt < now) confirmedTargets.delete(key);
  }
}
