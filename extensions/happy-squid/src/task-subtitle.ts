import { launchCommand, LaunchType } from "@raycast/api";

export async function updateTaskSubtitle(subtitle: string): Promise<void> {
  try {
    await launchCommand({ name: "tasks", type: LaunchType.Background, context: { subtitle } });
  } catch (error) {
    console.warn("[tasks] Could not update launcher subtitle", error);
  }
}
