import { getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const MEMORY_MACHINE_WEBSITE = "https://memorymachine.app/";

class MemoryMachineNotInstalledError extends Error {
  constructor() {
    super(`Install Memory Machine on your Mac to use this extension. Get the app at ${MEMORY_MACHINE_WEBSITE}`);
    this.name = "MemoryMachineNotInstalledError";
  }
}

export async function openMemoryMachineUrl(url: string) {
  // Query a bare deep link so search text and dates stay out of app discovery.
  const applications = await getApplications("memorymachine://settings").catch(() => {
    throw new MemoryMachineNotInstalledError();
  });
  const application = applications[0];
  if (!application) {
    throw new MemoryMachineNotInstalledError();
  }

  await open(url, application.path);
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
