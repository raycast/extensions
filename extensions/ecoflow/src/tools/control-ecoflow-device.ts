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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const device = await createEcoFlowService().getDeviceSnapshot(input.deviceIdentifier);
  if (!device.online) throw new Error(`${device.name} is offline.`);

  const command = findDeviceCommand(device, input.command);
  if (!command) {
    throw new Error(`${device.profile.displayName} does not support the requested control "${input.command}".`);
  }
  validateCommandValue(command, input.value);
  command.buildPayload(input.value, device.quotas);

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
    const service = createEcoFlowService();
    const result = await service.executeCommand({
      serialNumber: input.deviceIdentifier,
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
