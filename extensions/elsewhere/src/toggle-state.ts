import { Toast, showToast } from "@raycast/api";

import { ElsewhereCommand } from "./control-url";
import { executeElsewhereCommand } from "./command-runner";
import { ElsewhereSnapshotV1, readElsewhereState } from "./state-reader";

interface ToggleOptions {
  command: (snapshot: ElsewhereSnapshotV1) => ElsewhereCommand;
  successTitle: (snapshot: ElsewhereSnapshotV1) => string;
}

export async function toggleFromCurrentState(options: ToggleOptions): Promise<void> {
  const state = await readElsewhereState();

  if (state.kind !== "ready" || !state.snapshot.ready) {
    const title =
      state.kind === "stale"
        ? "Elsewhere Isn’t Running"
        : state.kind === "unsupported"
          ? "Update the Elsewhere Extension"
          : "Open Elsewhere First";
    const message =
      state.kind === "malformed"
        ? "Elsewhere’s state snapshot could not be read."
        : state.kind === "unsupported"
          ? `Snapshot schema ${state.schemaVersion} is not supported.`
          : "A current state is required to choose the correct action.";

    await showToast({ style: Toast.Style.Failure, title, message });
    return;
  }

  await executeElsewhereCommand(options.command(state.snapshot), {
    successTitle: options.successTitle(state.snapshot),
  });
}
