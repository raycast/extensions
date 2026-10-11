import { showToast, Toast } from "@raycast/api";
import { createEcoFlowService } from "../devices/runtime";
import type { DeviceCommandRequest } from "../types/device";

export async function sendDeviceCommand(request: DeviceCommandRequest, onSuccess?: () => void): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Sending EcoFlow control" });

  try {
    const result = await createEcoFlowService().executeCommand(request);
    toast.style = Toast.Style.Success;
    toast.title = result.commandTitle;
    toast.message = `${result.device.name} accepted the request.`;
    onSuccess?.();
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "EcoFlow control failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    return false;
  }
}
