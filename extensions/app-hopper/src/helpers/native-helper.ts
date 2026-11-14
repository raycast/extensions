import { execBinary, getErrorMessage, OSA_TIMEOUT_MS } from "./applescript";
import { getNativeExecutable, nativeHelperArguments } from "./swift-package";

export async function runNativeHelper(name: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execBinary(await getNativeExecutable(), nativeHelperArguments(name, args), {
      timeout: OSA_TIMEOUT_MS,
    });
    return stdout.trimEnd();
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
