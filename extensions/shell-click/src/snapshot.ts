import { commandSchema, snapshotSchema } from "./model";
export type ToolCall = (
  name: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

export async function loadPaletteSnapshot(call: ToolCall) {
  const snapshot = snapshotSchema.parse(
    await call("list_commands", { includeRuntime: true }),
  );
  // Older helpers ignore includeRuntime. Reuse their existing log/state tool on
  // the same MCP connection; no second implementation of the runtime or store.
  for (const command of snapshot.commands) {
    if (command.state || command.runtimeError) continue;
    try {
      const runtime = commandSchema
        .pick({ state: true, detectedEndpoints: true })
        .parse(
          await call("get_command_log", { id: command.id, maximumBytes: 1 }),
        );
      if (!runtime.state)
        throw new Error("The helper returned no runtime state.");
      Object.assign(command, runtime);
    } catch (error) {
      command.runtimeError =
        error instanceof Error ? error.message : String(error);
    }
  }
  return snapshot;
}
