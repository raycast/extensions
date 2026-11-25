import { execBinary, getErrorMessage, OSA_TIMEOUT_MS } from "./applescript";
import { getNativeExecutable, nativeHelperArguments } from "./swift-package";

export async function runNativeHelper(name: string, args: string[], signal?: AbortSignal): Promise<string> {
  try {
    signal?.throwIfAborted();
    const { stdout } = await execBinary(await getNativeExecutable(), nativeHelperArguments(name, args), {
      timeout: OSA_TIMEOUT_MS,
      signal,
    });
    return stdout.trimEnd();
  } catch (error) {
    signal?.throwIfAborted();
    throw new Error(getErrorMessage(error));
  }
}
