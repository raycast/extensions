import { open } from "@raycast/api";
import { TerminalExecutor, TerminalExecuteParams } from "../types";

// ============================================
// Generic Executor (fallback for unsupported terminals)
// ============================================

export class GenericExecutor implements TerminalExecutor {
  async execute({ path, bundleId }: TerminalExecuteParams): Promise<void> {
    // Fallback: just open the directory in the terminal app
    // Command execution is not supported for unknown terminals
    await open(path, bundleId);
  }
}
