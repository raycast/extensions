import { getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const MEMORY_MACHINE_WEBSITE = "https://memorymachine.app/";
const MEMORY_MACHINE_BUNDLE_ID = "com.heckmann.orbit";

class MemoryMachineNotInstalledError extends Error {
  constructor() {
    super(`Install Memory Machine on your Mac to use this extension. Get the app at ${MEMORY_MACHINE_WEBSITE}`);
    this.name = "MemoryMachineNotInstalledError";
  }
}

export async function openMemoryMachineUrl(url: string) {
  try {
    await open(url);
  } catch (error) {
    // Check by bundle ID only after launch fails. URL-handler lookup can miss a registered app.
    const applications = await getApplications().catch(() => undefined);
    if (applications && !applications.some((application) => application.bundleId === MEMORY_MACHINE_BUNDLE_ID)) {
      throw new MemoryMachineNotInstalledError();
    }
    throw error;
  }
}

export async function showMemoryMachineError(error: unknown, title: string, retry: () => Promise<void>) {
  if (error instanceof MemoryMachineNotInstalledError) {
    // With the main window closed, Raycast falls back to a HUD without actions.
    await open("raycast://");
    await showToast({
      style: Toast.Style.Failure,
      title: "Memory Machine required",
      message: error.message,
      primaryAction: {
        title: "Get Memory Machine",
        onAction: async () => {
          await open(MEMORY_MACHINE_WEBSITE);
        },
      },
      secondaryAction: {
        title: "Try Again",
        onAction: retry,
      },
    });
    return;
  }

  await showFailureToast(error, { title });
}
