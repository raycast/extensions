import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createPackageInvocation,
  normalizeCommandError,
  type CcusageResult,
  type PackageInvocation,
} from "../../common/lib/command";

const execFileAsync = promisify(execFile);

export type AmpInvocation = PackageInvocation;

export const createAmpInvocation = (): AmpInvocation =>
  createPackageInvocation("@ccusage/amp", ["daily", "--json"]);

export const runAmpDaily = async (): Promise<CcusageResult> => {
  const invocation = createAmpInvocation();

  try {
    const { stdout } = await execFileAsync(invocation.file, invocation.args, {
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10,
    });

    return {
      command: invocation.commandText,
      stdout,
    };
  } catch (error) {
    throw normalizeCommandError(invocation.commandText, error);
  }
};
