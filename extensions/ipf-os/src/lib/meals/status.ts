import { LaunchType, launchCommand } from "@raycast/api";

export async function refreshMealsStatus(): Promise<void> {
  if (process.platform !== "darwin") return;
  // The optional command may be disabled.
  await launchCommand({ name: "meals-status", type: LaunchType.Background }).catch(() => undefined);
}
