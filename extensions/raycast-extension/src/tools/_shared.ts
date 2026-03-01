import { runZbdw } from "../lib/runner";

export async function runTool(args: string[]): Promise<unknown> {
  return runZbdw(args);
}
