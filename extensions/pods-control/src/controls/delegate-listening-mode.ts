import { launchCommand, LaunchType } from "@raycast/api";
import { CYCLE_LISTENING_MODE_COMMAND_NAME } from "../commands/names";
import { runWithCliGuard } from "../setup/guard";
import { runSetListeningModeCommand } from "./listening-mode";
import type { SetListeningModeLaunchContext } from "../commands/launch-context";
import type { ListeningModes } from "../features/types";

export async function setListeningMode(mode: ListeningModes): Promise<void> {
  // A command can only set its own subtitle, so set commands run the change inside Cycle
  // Listening Mode, which then shows the confirmed mode in its subtitle.
  const context: SetListeningModeLaunchContext = { operation: "set", mode };

  // Keep setup in the originating command. Delegating an installation can time
  // out while the target is still running, which previously opened setup twice.
  await runWithCliGuard(async () => {
    try {
      await launchCommand({
        name: CYCLE_LISTENING_MODE_COMMAND_NAME,
        type: LaunchType.UserInitiated,
        context,
      });
    } catch (error) {
      console.warn("Could not delegate to Cycle Listening Mode; using the CLI fallback", error);
      // Publishing here would set this command's subtitle, not Cycle's. The Pods Status
      // refresh that follows every control operation updates Cycle instead.
      await runSetListeningModeCommand(mode, { updateCycleSubtitle: false });
    }
  });
}
