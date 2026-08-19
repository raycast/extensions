import { showToast, Toast } from "@raycast/api";
import { ensureSafetyAcknowledgement } from "./safety";
import { formatHeight } from "./model";
import { moveDesk, NativeEvent, nudgeDesk, readDesk, stopDesk } from "./native";
import { getPreset, PresetName, savePreset } from "./storage";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function updateProgress(toast: Toast, event: NativeEvent) {
  if (event.heightCm !== undefined) {
    toast.message = formatHeight(event.heightCm);
  }
}

export function moveToPresetCommand(name: PresetName) {
  return async function Command() {
    if (!(await ensureSafetyAcknowledgement())) return;
    const target = await getPreset(name);
    const label = name === "sit" ? "Sit" : "Stand";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting to desk",
      message: formatHeight(target),
    });
    try {
      const result = await moveDesk(target, (event) => {
        toast.title = `Moving desk to ${label}`;
        updateProgress(toast, event);
      });
      toast.style = Toast.Style.Success;
      toast.title =
        result.outcome === "stopped"
          ? "Stop command sent"
          : `Desk moved to ${label}`;
      toast.message =
        result.outcome === "stopped"
          ? "Use the physical control if the desk is still moving."
          : result.heightCm === undefined
            ? ""
            : formatHeight(result.heightCm);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not move desk";
      toast.message = errorMessage(error);
    }
  };
}

export function nudgeCommand(direction: "up" | "down") {
  return async function Command() {
    if (!(await ensureSafetyAcknowledgement())) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting to desk",
    });
    try {
      const result = await nudgeDesk(direction, (event) => {
        toast.title = direction === "up" ? "Raising desk" : "Lowering desk";
        updateProgress(toast, event);
      });
      toast.style = Toast.Style.Success;
      toast.title =
        result.outcome === "stopped" ? "Stop command sent" : "Desk adjusted";
      toast.message =
        result.outcome === "stopped"
          ? "Use the physical control if the desk is still moving."
          : result.heightCm === undefined
            ? ""
            : formatHeight(result.heightCm);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not adjust desk";
      toast.message = errorMessage(error);
    }
  };
}

export function savePresetCommand(name: PresetName) {
  return async function Command() {
    const label = name === "sit" ? "Sit" : "Stand";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting to desk",
    });
    try {
      const result = await readDesk();
      if (result.heightCm === undefined)
        throw new Error("The desk did not report its height.");
      await savePreset(name, result.heightCm);
      toast.style = Toast.Style.Success;
      toast.title = `Saved ${label} position`;
      toast.message = formatHeight(result.heightCm);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not save ${label} position`;
      toast.message = errorMessage(error);
    }
  };
}

export async function stopCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Stopping desk",
  });
  try {
    const result = await stopDesk();
    toast.style = Toast.Style.Success;
    toast.title = "Stop command sent";
    toast.message =
      result.heightCm === undefined
        ? "Use the physical control if the desk is still moving."
        : `${formatHeight(result.heightCm)} · Use the physical control if needed.`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Stop requested";
    toast.message = `${errorMessage(error)} Use the physical control if the desk is still moving.`;
  }
}
