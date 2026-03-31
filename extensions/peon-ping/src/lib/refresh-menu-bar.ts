import { LaunchType } from "@raycast/api";

export type RefreshMenuBarDeps = {
  launchCommand: (options: { name: string; type: LaunchType }) => Promise<void>;
};

export async function refreshMenuBarCommand(
  deps: RefreshMenuBarDeps,
): Promise<void> {
  try {
    await deps.launchCommand({
      name: "peon-ping-menu-bar",
      type: LaunchType.Background,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes(
          "must be activated before it can be run in the background",
        )
      ) {
        return;
      }
    }
    throw error;
  }
}
