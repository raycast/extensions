import { ElsewhereCommand } from "./control-url";
import { executeElsewhereCommand } from "./command-runner";
import { recoverElsewhereState } from "./state-recovery";
import { ElsewhereSnapshotV1, readElsewhereState } from "./state-reader";

interface StateGatedCommandOptions {
  command: (snapshot: ElsewhereSnapshotV1) => ElsewhereCommand;
  successTitle: (snapshot: ElsewhereSnapshotV1) => string;
}

export async function executeFromCurrentState(options: StateGatedCommandOptions): Promise<void> {
  const execute = (snapshot: ElsewhereSnapshotV1) =>
    executeElsewhereCommand(options.command(snapshot), {
      successTitle: options.successTitle(snapshot),
    });
  const state = await readElsewhereState();

  if (state.kind !== "ready" || !state.snapshot.ready) {
    await recoverElsewhereState(state, execute);
    return;
  }

  await execute(state.snapshot);
}
