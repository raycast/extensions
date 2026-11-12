import { LaunchType, environment, showHUD, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { HdrctlError, type Display, type Selector, resolveTarget, setState, targetSelector } from "./lib/hdrctl";

export default async function toggleHdr(): Promise<void> {
  const selector = targetSelector();

  // A scheduled run must never flip the display. It only refreshes the label.
  if (environment.launchType === LaunchType.Background) {
    await refreshSubtitle();
    return;
  }

  try {
    const display = await resolveTarget();

    if (!display.hdrCapable) {
      await showNotSupported(display);
      return;
    }

    const state = await setState(selector, "toggle");
    await updateCommandMetadata({ subtitle: subtitleFor(display.name, state) });
    await showHUD(`HDR ${state === "on" ? "On" : "Off"} — ${display.name}`);
  } catch (error) {
    await showToggleFailure(error, selector);
  }
}

function subtitleFor(displayName: string, state: "on" | "off"): string {
  return `${state === "on" ? "Disable" : "Enable"} HDR — ${displayName}`;
}

/** Reads the current state and rewrites the subtitle shown under the command title. */
async function refreshSubtitle(): Promise<void> {
  try {
    const display = await resolveTarget();
    await updateCommandMetadata({ subtitle: subtitleFor(display.name, display.hdr ? "on" : "off") });
  } catch (error) {
    const subtitle =
      error instanceof HdrctlError && error.code === 2 ? "No HDR display connected" : "HDR state unavailable";

    await updateCommandMetadata({ subtitle }).catch(() => undefined);
  }
}

async function showNotSupported(display: Display): Promise<void> {
  const message = `"${display.name}" does not support HDR.`;
  await showFailureToast(new Error(message), { title: "HDR Not Supported", message });
}

async function showToggleFailure(error: unknown, selector: Selector | undefined): Promise<void> {
  if (error instanceof HdrctlError) {
    const configuredName = selector !== undefined && "name" in selector ? selector.name : undefined;

    switch (error.code) {
      case 2:
        await showFailureToast(error, {
          title: "Display Not Found",
          message:
            configuredName !== undefined
              ? `"${configuredName}" is not connected. Connect it or clear the Display Name preference.`
              : "No external HDR-capable display is connected. Connect one or clear the Display Name preference.",
        });
        return;

      case 3:
        await showFailureToast(error, {
          title: "HDR Not Supported",
          message: configuredName !== undefined ? `"${configuredName}" does not support HDR.` : error.message,
        });
        return;

      case 4:
        await showFailureToast(error, {
          title: "HDR Did Not Switch",
          message: "The display did not reach the requested state.",
        });
        return;

      default:
        await showFailureToast(error, {
          title: "HDR Toggle Failed",
          message: error.message.length > 0 ? error.message : "hdrctl failed.",
        });
        return;
    }
  }

  const failure = error instanceof Error ? error : new Error(String(error));
  await showFailureToast(failure, {
    title: "HDR Toggle Failed",
    message: failure.message.length > 0 ? failure.message : "hdrctl failed.",
  });
}
