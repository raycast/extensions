import {
  getApplications,
  showToast,
  Toast,
  open,
  LocalStorage,
  launchCommand,
  LaunchType,
} from "@raycast/api";

export const WISPR_FLOW_BUNDLE_ID = "com.electron.wispr-flow";
export const ONBOARDING_KEY = "wispr-flow-onboarding-complete";

// Set to true to simulate app not installed (for testing)
const DEBUG_SIMULATE_NOT_INSTALLED = false;

export async function isWisprFlowInstalled() {
  if (DEBUG_SIMULATE_NOT_INSTALLED) {
    return false;
  }
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === WISPR_FLOW_BUNDLE_ID);
}

export async function isOnboardingComplete() {
  const value = await LocalStorage.getItem<string>(ONBOARDING_KEY);
  return value === "true";
}

export async function checkOnboardingAndInstallation(): Promise<boolean> {
  // Check onboarding first
  const onboardingComplete = await isOnboardingComplete();
  if (!onboardingComplete) {
    // Redirect to main command for onboarding
    await launchCommand({ name: "wispr-flow", type: LaunchType.UserInitiated });
    return false;
  }

  // Check installation
  const isInstalled = await isWisprFlowInstalled();
  if (!isInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Wispr Flow is not installed.",
      message: "Install from wisprflow.ai",
      primaryAction: {
        title: "Download Wispr Flow",
        onAction: async (toast) => {
          await open("https://wisprflow.ai");
          await toast.hide();
        },
      },
    });
    return false;
  }

  return true;
}
