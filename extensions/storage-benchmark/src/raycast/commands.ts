import { LaunchType, launchCommand, showToast, Toast } from "@raycast/api";

const commandTitles = {
  "run-storage-benchmark": "Run Storage Benchmark",
  "view-storage-history": "View Storage History",
};

export async function launchStorageCommand(name: keyof typeof commandTitles): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could Not Open ${commandTitles[name]}`,
      message: `Try again, or open “${commandTitles[name]}” from Raycast’s main search.`,
      primaryAction: {
        title: "Try Again",
        onAction: () => launchStorageCommand(name),
      },
    });
  }
}
