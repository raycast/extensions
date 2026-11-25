import { Clipboard, getPreferenceValues, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { bootDevice, Device, stopDevice } from "./devices";
import { describeSource, launchOnDevice, LaunchSource, openInOrbitApp } from "./launch";
import { ORBIT_DOWNLOAD_URL, OrbitError, OrbitNotInstalledError } from "./orbit";

export function getAudioPreference(): boolean {
  return !getPreferenceValues<Preferences>().emulatorWithoutAudio;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const getOrbitAction: Toast.ActionOptions = {
  title: "Get Expo Orbit",
  onAction: (toast) => {
    void toast.hide();
    void open(ORBIT_DOWNLOAD_URL);
  },
};

function copyErrorAction(error: unknown): Toast.ActionOptions {
  return {
    title: "Copy Error",
    onAction: (toast) => {
      void toast.hide();
      void Clipboard.copy(errorMessage(error));
    },
  };
}

/** Shows a failure on a toast, with an action that fixes it when there's one. */
function showFailure(toast: Toast, title: string, error: unknown, primaryAction?: Toast.ActionOptions) {
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = errorMessage(error);
  if (error instanceof OrbitNotInstalledError) {
    toast.primaryAction = getOrbitAction;
    toast.secondaryAction = undefined;
    return;
  }
  toast.primaryAction = primaryAction ?? copyErrorAction(error);
  toast.secondaryAction = primaryAction ? copyErrorAction(error) : undefined;
}

/** Boots a simulator or emulator, or brings it to the front if it already runs. Returns whether it worked. */
export async function launchDeviceWithFeedback(device: Device): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: device.isRunning ? `Showing ${device.name}…` : `Launching ${device.name}…`,
  });
  try {
    await bootDevice(device, { audio: getAudioPreference() });
    toast.style = Toast.Style.Success;
    toast.title = device.isRunning ? `Showed ${device.name}` : `Launched ${device.name}`;
    return true;
  } catch (error) {
    showFailure(toast, `Couldn't launch ${device.name}`, error);
    return false;
  }
}

export async function stopDeviceWithFeedback(device: Device): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Stopping ${device.name}…` });
  try {
    await stopDevice(device);
    toast.style = Toast.Style.Success;
    toast.title = `Stopped ${device.name}`;
    return true;
  } catch (error) {
    showFailure(toast, `Couldn't stop ${device.name}`, error);
    return false;
  }
}

type LaunchFeedbackOptions = {
  skipInstall?: boolean;
  forceExpoGo?: boolean;
  /** Called after a launch that worked, including one started from a toast action. */
  onSuccess?: () => void;
};

/** Opens a build, update or Snack on a device and reports progress in a toast. Returns whether it worked. */
export async function launchSourceWithFeedback(
  source: LaunchSource,
  device: Device,
  options: LaunchFeedbackOptions = {},
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Starting…" });
  try {
    await launchOnDevice(source, device, {
      audio: getAudioPreference(),
      skipInstall: options.skipInstall,
      forceExpoGo: options.forceExpoGo,
      onProgress: ({ title, message }) => {
        toast.title = title;
        toast.message = message;
      },
    });
    toast.style = Toast.Style.Success;
    toast.title = `Opened ${describeSource(source)} on ${device.name}`;
    toast.message = undefined;
    options.onSuccess?.();
    return true;
  } catch (error) {
    const title = `Couldn't open ${describeSource(source)} on ${device.name}`;

    if (error instanceof OrbitError && error.code === "NO_DEVELOPMENT_BUILDS_AVAILABLE") {
      // The same choices Expo Orbit offers when it finds no development build for an update.
      showFailure(toast, "No Compatible Development Build", error, {
        title: "Open in Expo Go",
        onAction: (current) => {
          void current.hide();
          void launchSourceWithFeedback(source, device, { ...options, forceExpoGo: true });
        },
      });
      toast.secondaryAction = {
        title: "Open with Deep Link",
        onAction: (current) => {
          void current.hide();
          void launchSourceWithFeedback(source, device, { ...options, skipInstall: true });
        },
      };
      return false;
    }

    if (error instanceof OrbitError && error.code === "UNTRUSTED_SOURCE") {
      showFailure(toast, "Untrusted Source", error, {
        title: "Add Trusted Source",
        onAction: (current) => {
          void current.hide();
          void openExtensionPreferences();
        },
      });
      return false;
    }

    // Expo Orbit handles cases the CLI can't on its own, such as resigning a build for an iPhone or
    // trusting a new source, so offer to hand the build over to it.
    showFailure(toast, title, error, {
      title: "Open in Expo Orbit",
      onAction: (current) => {
        void current.hide();
        void openInOrbitApp(source, device).catch((openError: unknown) =>
          showFailure(current, "Couldn't open Expo Orbit", openError),
        );
      },
    });
    return false;
  }
}
