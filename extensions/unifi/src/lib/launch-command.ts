import { launchCommand, showToast, Toast } from "@raycast/api";

export function launchUniFiCommand(options: Parameters<typeof launchCommand>[0], failureTitle: string): void {
  void launchCommand(options).catch((error: unknown) => {
    void showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: error instanceof Error ? error.message : "Unknown error",
    }).catch(() => undefined);
  });
}
